// app/(admin)/moderation/diary/_components/diary-shared.tsx
"use client";

import {
  BookOpen, Clock, CheckCircle, XCircle, 
} from "lucide-react";

// ============================================================
// Константы
// ============================================================

// Стандартный debounce для moderation-секций (400ms везде: reports,
// block-signals, fraud-alerts, photos, photo-comments, dating).
export { SEARCH_DEBOUNCE_MS } from "@/lib/constants";
export const PER_PAGE = 15;

// ============================================================
// STATUS_TABS — табы фильтра статуса дневников
// ============================================================
export const STATUS_TABS: Array<{
  value: "all" | "pending" | "published" | "rejected";
  label: string;
  icon: typeof BookOpen;
  iconColor: string;
}> = [
  { value: "all",       label: "Все",          icon: BookOpen,    iconColor: "text-muted-foreground" },
  { value: "pending",   label: "Модерация",    icon: Clock,       iconColor: "text-yellow-500" },
  { value: "published", label: "Опубликован",  icon: CheckCircle, iconColor: "text-green-500" },
  { value: "rejected",  label: "Отклонён",     icon: XCircle,     iconColor: "text-red-500" },
];

export const DEFAULT_STATUS = "pending";
export const DEFAULT_TRASHED = "without";
export const DEFAULT_RUBRIC = "all";

