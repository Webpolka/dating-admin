// app/(admin)/system/roles/_components/_shared.ts
//
// Общие константы для страницы "Роли и Админы".

// Список ролей для назначения (без "user" — юзер не staff).
// Порядок важен: используется в keyboard-навигации dropdown (←→).
export const ROLES = [
  { value: "support", label: "Саппорт" },
  { value: "moderator", label: "Модератор" },
  { value: "admin", label: "Админ" },
] as const;

// Debounce для autocomplete-поиска юзеров. 400мс — оптимально для
// админки (как в транзакциях/тарифах/подарках). Раньше было 800ms — долго.
export { SEARCH_DEBOUNCE_MS } from "@/lib/constants";

// Количество сотрудников на странице в таблице (должно совпадать с бэком).
export const STAFF_PER_PAGE = 20;