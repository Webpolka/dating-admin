// app/(admin)/security/block-signals/_components/block-signals-shared.tsx
"use client";


// ============================================================
// Константы
// ============================================================

// Стандартный debounce для moderation-секций (см. fraud-alerts, reports,
// photos, photo-comments, dating — везде 400ms).
export { SEARCH_DEBOUNCE_MS } from "@/lib/constants";

// Пороги блокировок для dropdown-фильтра (минимум 3 — отсекаем норм юзеров).
export const THRESHOLD_OPTIONS = [
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "5", label: "5+" },
  { value: "10", label: "10+" },
] as const;

export const DEFAULT_THRESHOLD = "3";
export const PER_PAGE = 20;

