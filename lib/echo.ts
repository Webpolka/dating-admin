// lib/echo.ts
import Echo from "laravel-echo";
import Pusher from "pusher-js";

declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}

/**
 * Каналы Echo типизируем минимально: name + callback с unknown-data.
 * Полная типизация каналов Reverb — отдельная задача (генерик-хелперы
 * событий); для админки достаточно безопасного unknown + касты в местах
 * подписки, где структура события известна.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- типы каналов laravel-echo дженерик-контравариантны, any здесь — штатный способ (см. доки laravel-echo)
export type EchoInstance = Echo<any>;

let echoInstance: EchoInstance | null = null;

/**
 * Возвращает singleton-инстанс Echo.
 * Первый вызов инициализирует подключение к Reverb,
 * последующие — возвращают тот же инстанс.
 *
 * ВНИМАНИЕ: вызывать только из client-компонентов (useEffect, event handlers).
 * В Server Components getEcho() бросит ошибку — это намеренно, чтобы поймать
 * случайный импорт не в том месте.
 */
export function getEcho(): EchoInstance {
  if (typeof window === "undefined") {
    throw new Error(
      "getEcho() can only be called in the browser. " +
      "Make sure it's used inside a client component (useEffect, event handler, etc.)"
    );
  }

  if (echoInstance) return echoInstance;

  // Pusher нужно повесить на window — Echo ищет его там
  window.Pusher = Pusher;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- конфиг Echo допускает опции всех broadcaster'ов
  echoInstance = new Echo<any>({
    broadcaster: "reverb",
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY!,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST,
    wssHost: process.env.NEXT_PUBLIC_REVERB_HOST,
    wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 80),
    wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 443),
    forceTLS: process.env.NEXT_PUBLIC_REVERB_SCHEME === "https",
    enabledTransports: ["ws", "wss"],
    // Sanctum cookie-авторизация для приватных каналов
    authEndpoint: "/broadcasting/auth",
    withCredentials: true,
  });

  return echoInstance;
}