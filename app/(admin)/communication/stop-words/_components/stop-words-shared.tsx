// app/(admin)/communication/stop-words/_components/stop-words-shared.tsx
"use client";

import type { StopWordAction, StopWordCategory } from "@/hooks/admin/use-stop-words";

// ============================================================
// Опции фильтров — синхронизированы с PHP enum'ами
// ============================================================
export const CATEGORY_OPTIONS: Array<{ value: StopWordCategory; label: string }> = [
  { value: "mat", label: "Мат" },
  { value: "scam", label: "Мошенничество" },
  { value: "prostitution", label: "Проституция" },
  { value: "drugs", label: "Наркотики" },
  { value: "contacts", label: "Контакты/ТГ" },
];

export const ACTION_OPTIONS: Array<{ value: StopWordAction; label: string }> = [
  { value: "mask", label: "Маскировать" },
  { value: "reject", label: "Блокировать" },
  { value: "alert", label: "Тревога (Антифрод)" },
];

export const STATUS_OPTIONS = [
  { value: "all", label: "Все статусы" },
  { value: "active", label: "Только активные" },
  { value: "inactive", label: "Только выключенные" },
];

export const BULK_ACTIONS = [
  { value: "activate", label: "Активировать" },
  { value: "deactivate", label: "Деактивировать" },
  { value: "delete", label: "Удалить навсегда" },
];

