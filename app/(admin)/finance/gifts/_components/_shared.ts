// app/(admin)/finance/gifts/_components/_shared.ts
//
// Общие константы для страницы подарков.
// Вынесено из gifts-page-client.tsx (было 1298 строк, разбито на 5 файлов + shared).

import type { GiftCategory, GiftType } from "@/hooks/admin/use-gifts";

// Debounce для поиска. 400мс — оптимально для админки (как в транзакциях/тарифах).
export { SEARCH_DEBOUNCE_MS } from "@/lib/constants";

// Количество записей на странице.
export const PER_PAGE = 15;

export const CATEGORY_OPTIONS: Array<{ value: GiftCategory; label: string }> = [
  { value: "romantic", label: "Романтика" },
  { value: "cars", label: "Авто" },
  { value: "male", label: "Для него" },
  { value: "female", label: "Для неё" },
  { value: "18+", label: "18+" },
  { value: "fun", label: "Приколы" },
];

// Типы подарков: main (обычные), premium (VIP), services (услуги — буст, невидимка и т.д.)
// color — Tailwind-классы для бейджа.
export const TYPE_OPTIONS: Array<{ value: GiftType; label: string; color: string }> = [
  { value: "main", label: "Основной", color: "bg-secondary text-secondary-foreground" },
  { value: "premium", label: "Премиум", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  { value: "services", label: "Услуги", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
];

export type Tab = "catalog" | "history";


/**
 * Синхронно читает параметр из window.location.search.
 *
 * Используется для initial state в CatalogTab/HistoryTab ВМЕСТО useSearchParams,
 * потому что useSearchParams возвращает устаревший snapshot при перемонтировании
 * (после router.replace) — это известная проблема Next.js App Router.
 *
 * window.location.search всегда актуален на клиенте.
 * На сервере (SSR) возвращает пустую строку — но эти компоненты "use client",
 * им SSR не нужен для initial state.
 */
export function getInitialUrlParam(name: string): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get(name) ?? "";
}