// app/(admin)/finance/transactions/_components/_shared.ts
//
// Общие константы и типы для страниц транзакций.
// Вынесено из transactions-page-client.tsx (было 804 строки, теперь
// разбито на 4 файла + shared).

import {
  Clock, CheckCircle, XCircle, RotateCw,
} from "lucide-react";
import type { RefundReason, DatePeriod } from "@/hooks/admin/use-transactions";

// Debounce для поиска. 400мс — оптимально для админки: достаточно быстро
// для пользователя, не спамит API на каждое нажатие.
export { SEARCH_DEBOUNCE_MS } from "@/lib/constants";

// Количество транзакций на странице.
export const PER_PAGE = 15;

export type StatusFilterValue = "all" | "pending" | "success" | "failed" | "refunded";

export const STATUS_FILTERS: Array<{
  value: StatusFilterValue;
  label: string;
  icon: typeof Clock | null;
  iconColor?: string;
}> = [
  { value: "all", label: "Все", icon: null },
  { value: "pending", label: "В ожидании", icon: Clock, iconColor: "text-yellow-500" },
  { value: "success", label: "Успешные", icon: CheckCircle, iconColor: "text-green-500" },
  { value: "failed", label: "Ошибки", icon: XCircle, iconColor: "text-red-500" },
  { value: "refunded", label: "Возвраты", icon: RotateCw, iconColor: "text-blue-500" },
];

export const PERIOD_OPTIONS: Array<{ value: DatePeriod; label: string }> = [
  { value: "all", label: "За всё время" },
  { value: "day", label: "Сегодня" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
];

export const TYPE_OPTIONS = [
  { value: "all", label: "Все типы" },
  { value: "subscription", label: "Подписки" },
  { value: "credits", label: "Кредиты" },
];

export const REFUND_REASONS: Array<{ value: RefundReason; label: string }> = [
  { value: "user_request", label: "По запросу пользователя" },
  { value: "fraud", label: "Фрод / Мошенничество" },
  { value: "bank_error", label: "Ошибка банка / Эквайринга" },
  { value: "duplicate", label: "Дублирующий платеж" },
  { value: "admin_mistake", label: "Ошибка модератора" },
  { value: "other", label: "Другое" },
];