// app/(admin)/security/fraud-alerts/_components/fraud-alerts-shared.tsx
"use client";

import {
  Siren, Clock, CheckCircle, XCircle,
} from "lucide-react";

// ============================================================
// Константы
// ============================================================

// Стандартный debounce для moderation-секций (см. reports, block-signals,
// photos, photo-comments, dating — везде 400ms).
export { SEARCH_DEBOUNCE_MS } from "@/lib/constants";
export const PER_PAGE = 20;

// ============================================================
// STATUS_FILTERS — табы фильтра статуса
// ============================================================
// Аналог STATUS_TABS из reports-shared.tsx, но со своими иконками/цветами.
export const STATUS_FILTERS: Array<{
  value: "all" | "open" | "resolved" | "false_positive";
  label: string;
  icon: typeof Clock;
  iconColor: string;
}> = [
  { value: "all",            label: "Все",         icon: Siren,        iconColor: "text-muted-foreground" },
  { value: "open",           label: "Открытые",    icon: Clock,        iconColor: "text-yellow-500" },
  { value: "resolved",       label: "Подтверждены", icon: CheckCircle, iconColor: "text-green-500" },
  { value: "false_positive", label: "Ложняки",     icon: XCircle,      iconColor: "text-red-500" },
];

export const SEVERITY_OPTIONS: Array<{ value: "all" | "low" | "medium" | "high"; label: string }> = [
  { value: "all",    label: "Любая опасность" },
  { value: "low",    label: "Низкий" },
  { value: "medium", label: "Средний" },
  { value: "high",   label: "Высокий" },
];

export const DEFAULT_STATUS = "open";
export const DEFAULT_SEVERITY = "all";

