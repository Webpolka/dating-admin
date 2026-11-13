// app/(admin)/moderation/reports/_components/reports-shared.tsx
"use client";

import {
  Clock, CheckCircle, XCircle,
} from "lucide-react";

// ============================================================
// Константы
// ============================================================

export { SEARCH_DEBOUNCE_MS } from "@/lib/constants";

export const STATUS_TABS: Array<{
  value: "all" | "pending" | "resolved" | "rejected";
  label: string;
  icon: typeof Clock;
  iconColor: string;
}> = [
  { value: "all",      label: "Все",       icon: Clock,       iconColor: "text-muted-foreground" },
  { value: "pending",  label: "Ожидают",   icon: Clock,       iconColor: "text-yellow-500" },
  { value: "resolved", label: "Решённые",  icon: CheckCircle, iconColor: "text-green-500" },
  { value: "rejected", label: "Отклонённые", icon: XCircle,   iconColor: "text-red-500" },
];

