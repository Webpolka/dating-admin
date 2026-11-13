// lib/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { ApiValidationError, ApiError } from "./types";

// Расширяем тип, чтобы помечать запросы, которые уже были ретраены
// после 419 (CSRF token mismatch). Без флага был бы бесконечный цикл.
declare module "axios" {
  export interface AxiosRequestConfig {
    _retriedAfterCsrf?: boolean;
  }
}

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    // ❌ УБРАЛИ "Content-Type": "application/json"
    // axios сам поставит правильный Content-Type в зависимости от тела:
    // - для объектов/строк → application/json
    // - для FormData → multipart/form-data; boundary=...
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  // Таймаут на клиенте — чтобы мутации не висели вечно.
  // Для скачивания больших файлов / загрузки медиа переопределяйте
  // в конкретном запросе: api.post(url, data, { timeout: 60000 }).
  timeout: 30000,
});

// Bare axios для запроса новой CSRF-куки. Без baseURL, потому что
// /sanctum/csrf-cookie находится на корневом пути (пробрасывается
// через next.config.ts rewrites), а не под /api.
const csrfAxios = axios.create({
  withCredentials: true,
});

// Helper: обновить CSRF-куку через Sanctum endpoint.
async function refreshCsrfCookie(): Promise<void> {
  await csrfAxios.get("/sanctum/csrf-cookie");
}

// ============================================================
// Response interceptors
// ============================================================
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const config = error.config as InternalAxiosRequestConfig | undefined;

    // --- 401: сессия истекла → редирект на /login ---
    if (status === 401) {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = `/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      }
      return Promise.reject(error);
    }

    // --- 419: CSRF-токен истёк → refresh + retry (ОДИН раз) ---
    //
    // Сценарий: админ долго бездействовал, XSRF-TOKEN cookie истёк,
    // следующий POST/PUT/DELETE получает 419. Без авто-recovery
    // пользователь видит "Страница устарела" и должен сам перезагружать.
    //
    // После фикса: автоматически обновляем CSRF-куку и повторяем запрос.
    // Если retry тоже падает с 419 — пробрасываем ошибку (что-то не так
    // с сессией, например, бэкенд перезапущен и сбросил куки).
    if (status === 419 && config && !config._retriedAfterCsrf) {
      const url = config.url || "";
      // Не retry'им:
      //  - /sanctum/csrf-cookie (бесконечный цикл)
      //  - /admin/login (там свой flow с CSRF, см. login-page-client.tsx)
      const isLoginRequest = url.includes("/admin/login");
      const isCsrfRequest = url.includes("/sanctum/csrf-cookie");

      if (!isLoginRequest && !isCsrfRequest) {
        try {
          await refreshCsrfCookie();
          config._retriedAfterCsrf = true;
          // api.request(config) повторит запрос с теми же headers и body,
          // но withXSRFToken: true автоматически подставит новый
          // X-XSRF-TOKEN header из обновлённой куки.
          return api.request(config);
        } catch (refreshError) {
          // Не удалось обновить CSRF (бэкенд лежит / сеть) — пробрасываем
          // оригинальную 419. isNetworkError потом подскажет пользователю
          // "Не удалось connect к серверу".
          console.error("[api] CSRF refresh failed:", refreshError);
          return Promise.reject(error);
        }
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================
// Хелперы для типизации ошибок
// ============================================================
// ВАЖНО: проверяйте ошибки в порядке isValidationError → isApiError →
// isNetworkError. Они НЕ исключают друг друга (одна ошибка может быть и
// isApiError, и isValidationError), поэтому порядок важен.

/**
 * 422 — ошибка валидации (неверный пароль, не заполнено поле и т.д.).
 * В response.data.errors — объект с массивами сообщений по полям.
 */
export function isValidationError(error: unknown): error is AxiosError<ApiValidationError> {
  return axios.isAxiosError(error) && error.response?.status === 422;
}

/**
 * Любая ошибка С ОТВЕТОМ от сервера (400, 401, 403, 404, 429, 500...).
 * Гарантирует, что error.response.data существует и типизирован как ApiError.
 *
 * ВНИМАНИЕ: для сетевых ошибок (нет интернета / бэкенд лежит / CORS)
 * возвращает false — у них нет response. Используйте isNetworkError().
 */
export function isApiError(error: unknown): error is AxiosError<ApiError> {
  return axios.isAxiosError(error) && Boolean(error.response?.data);
}

/**
 * Сетевая ошибка — нет ответа от сервера вообще.
 * Причины: нет интернета, бэкенд лежит, CORS заблокировал, DNS не резолвится,
 * timeout (если сервер не ответил за timeout ms).
 *
 * У такой ошибки нет response.data — пользователю можно показать
 * "Не удалось connect к серверу", а не "Ошибка 500".
 */
export function isNetworkError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error) && !error.response;
}

/**
 * Извлекает человекочитаемое сообщение об ошибке из любого catch (e).
 *
 * Приоритет:
 *  1. err.response.data.message — стандартный ответ API (Laravel)
 *  2. err.response.data.errors — ошибки валидации (берём первую)
 *  3. err.message — сетевая/JS-ошибка
 *  4. fallback — переданный текст по умолчанию
 *
 * Используется во всех onError хендлерах мутаций вместо дублирования
 * логики в каждом хуке.
 *
 * Пример:
 *   onError: (err) => toast.error(extractErrorMessage(err, "Ошибка сохранения"))
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err !== "object" || err === null) return fallback;

  const e = err as {
    response?: {
      data?: {
        message?: string;
        errors?: Record<string, string[]>;
      };
    };
    message?: string;
  };

  // Стандартный ответ API с ошибкой (403, 429, 500...)
  if (e.response?.data?.message) {
    return e.response.data.message;
  }

  // Ошибки валидации (422) — берём первую
  if (e.response?.data?.errors) {
    const firstField = Object.values(e.response.data.errors)[0];
    if (Array.isArray(firstField) && firstField.length > 0) {
      return firstField[0];
    }
  }

  // Сетевая ошибка (нет response)
  if (e.message) {
    return e.message;
  }

  return fallback;
}


/**
 * Извлекает ошибки валидации (422) из ответа API.
 *
 * Возвращает объект { field: string[] } или null, если это не 422
 * или структура не соответствует ожидаемой.
 *
 * Используется в формах для отображения серверных ошибок по полям:
 *   const backendErrors = extractValidationErrors(err);
 *   if (backendErrors) setFieldErrors(backendErrors);
 *   else toast.error(extractErrorMessage(err, "Ошибка сохранения"));
 */
export function extractValidationErrors(err: unknown): Record<string, string[]> | null {
  if (typeof err !== "object" || err === null) return null;
  const e = err as {
    response?: {
      status?: number;
      data?: {
        errors?: Record<string, string[]>;
      };
    };
  };

  // Только для 422 — ошибки валидации. Другие статусы могут иметь errors
  // в другом формате (например, 400 с generic message) — там нечего парсить.
  if (e.response?.status !== 422) return null;

  return e.response?.data?.errors ?? null;
}

export default api;