// app/(admin)/system/broadcasts/_components/_shared.ts
//
// Общие константы для страницы рассылок.

import { Bell, Mail, Smartphone } from "lucide-react";

// Debounce для поиска. 400мс — стандарт для админки.
export { SEARCH_DEBOUNCE_MS } from "@/lib/constants";

// Количество рассылок на странице.
export const PER_PAGE = 10;

export const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Все" },
  { value: "draft", label: "Черновики" },
  { value: "scheduled", label: "Запланированы" },
  { value: "sending", label: "В процессе" },
  { value: "sent", label: "Отправлены" },
  { value: "failed", label: "Ошибки" },
];

export const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  in_app: Bell,
  email: Mail,
  push: Smartphone,
};

export const TYPE_LABELS: Record<string, string> = {
  in_app: "Site",
  email: "Email",
  push: "Push",
};

// ============================================
// ТИПЫ ДЛЯ ФОРМЫ РАССЫЛКИ
// ============================================

export interface AudienceFilters {
  gender: string | null;
  is_premium: string | null;
  city_id: string | null;
  city_label: string | null;
  age_from: string | null;
  age_to: string | null;
  last_seen_days: string | null;
  has_photo: string | null;
}

export const EMPTY_FILTERS: AudienceFilters = {
  gender: null,
  is_premium: null,
  city_id: null,
  city_label: null,
  age_from: null,
  age_to: null,
  last_seen_days: null,
  has_photo: null,
};