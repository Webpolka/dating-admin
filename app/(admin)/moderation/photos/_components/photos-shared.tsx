// app/(admin)/moderation/photos/_components/photos-shared.tsx
"use client";

import {
  Clock, CheckCircle, XCircle, RotateCcw,
} from "lucide-react";

// ============================================================
// Константы
// ============================================================

export { SEARCH_DEBOUNCE_MS } from "@/lib/constants";

/** Базовый CSS-класс для badge-ов на фото (поверх картинки). */
export const BADGE_BASE_CLASS = "bg-black/70 text-white border-0 text-[11px] h-5 px-1.5";

/**
 * Вкладки статусов модерации фото.
 * value — значение для фильтра API + URL.
 * icon — lucide иконка.
 * iconColor — tailwind text-* класс для цвета иконки.
 */
export const STATUS_TABS: Array<{
  value: "pending" | "approved" | "rejected" | "quarantine";
  label: string;
  icon: typeof Clock;
  iconColor: string;
}> = [
  { value: "pending",   label: "Ожидают",  icon: Clock,       iconColor: "text-yellow-500" },
  { value: "approved",  label: "Одобрены", icon: CheckCircle, iconColor: "text-green-500" },
  { value: "rejected",  label: "Отклонены",icon: XCircle,     iconColor: "text-red-500" },
  { value: "quarantine",label: "Карантин", icon: RotateCcw,   iconColor: "text-blue-500" },
];

