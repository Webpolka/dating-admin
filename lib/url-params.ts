// lib/url-params.ts
//
// Синхронное чтение параметров из window.location.search.
//
// Используется для initial state в client-компонентах ВМЕСТО useSearchParams,
// потому что useSearchParams возвращает устаревший snapshot при перемонтировании
// (после router.replace) — это известная проблема Next.js App Router.
//
// window.location.search всегда актуален на клиенте.
// На сервере (SSR) возвращает пустую строку — но эти компоненты "use client",
// им SSR не нужен для initial state.
//
// ВАЖНО: использовать только в useEffect (после mount), иначе будет
// hydration mismatch (сервер вернёт '', клиент — реальное значение).

export function getInitialUrlParam(name: string): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get(name) ?? "";
}