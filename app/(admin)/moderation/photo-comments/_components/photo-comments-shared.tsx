// app/(admin)/moderation/photo-comments/_components/photo-comments-shared.tsx
"use client";

import {  
  MessageCircle, Clock, CheckCircle, XCircle, Trash2,
} from "lucide-react";

// ============================================================
// Константы
// ============================================================

export { SEARCH_DEBOUNCE_MS } from "@/lib/constants";

// Таб «Спам» убран (Вариант A): спам — это причина отклонения, не статус.
// Чтобы посмотреть спам-комментарии, модератор идёт в таб «Отклонены» и
// видит их с бейджем причины «Спам».
export const STATUS_TABS: Array<{  
  value: "all" | "pending" | "approved" | "rejected" | "karantine";
  label: string;
  icon: typeof Clock;
  iconColor: string;
}> = [
  { value: "all",       label: "Все",       icon: MessageCircle, iconColor: "text-muted-foreground" },
  { value: "pending",   label: "Ожидают",   icon: Clock,         iconColor: "text-yellow-500" },
  { value: "approved",  label: "Одобрены",  icon: CheckCircle,   iconColor: "text-green-500" },
  { value: "rejected",  label: "Отклонены", icon: XCircle,       iconColor: "text-red-500" },  
  { value: "karantine", label: "Карантин",  icon: Trash2,        iconColor: "text-blue-500" },
];

