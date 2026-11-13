// lib/api/auth.ts
//
// Чистые API-вызовы для auth-эндпоинтов админки.
// НЕ содержит UI-логику (редиректы, сброс стора и т.д.) — это уровень
// store/auth-store.ts. Здесь только HTTP + типизация ответов.
//
// Паттерн — объект `authApi` с методами, по образцу lib/api/staff.ts.
// Каждый метод возвращает типизированный ответ (data из axios).

import api from "@/lib/api";

/**
 * Ответ POST /api/admin/logout-everywhere.
 *
 * Бэк (AuthController::logoutEverywhere) возвращает:
 *   - message: человекочитаемый текст для toast'а
 *   - sessions_deleted: сколько сессий реально удалили (0 если других не было)
 */
export interface LogoutEverywhereResponse {
  message: string;
  sessions_deleted: number;
}

export const authApi = {
  /**
   * POST /api/admin/logout-everywhere
   *
   * Завершает ВСЕ сессии текущего юзера, КРОМЕ текущей.
   *
   * Сценарии (см. AuthController::logoutEverywhere() на бэке):
   *   - Подозрение на компрометацию — добить старые сессии на других девайсах.
   *   - Потерян девайс — завершить его сессию.
   *
   * ВАЖНО про текущую сессию: она ОСТАЁТСЯ живой. Админ не выкинет сам себя.
   * После запроса админ продолжает работу без перелогина.
   *
   * CSRF: X-XSRF-TOKEN header подставит интерсептор lib/api.ts (withXSRFToken: true).
   * Cookies (session + XSRF-TOKEN) тоже подставятся автоматически (withCredentials: true).
   *
   * @throws AxiosError — при сетевой ошибке / 401 / 500. Обрабатывается
   *   в вызывающем коде через extractErrorMessage() из lib/api.ts.
   */
  logoutEverywhere: async (): Promise<LogoutEverywhereResponse> => {
    const { data } = await api.post<LogoutEverywhereResponse>('/admin/logout-everywhere');
    return data;
  },
};