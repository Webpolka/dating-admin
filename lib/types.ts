// lib/types.ts

// Тип юзера (администратора)
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'moderator' | 'support' | 'user';
  is_verified: boolean;
  avatar_url: string;
  is_founder: boolean;
}

// Стандартный ответ API с ошибкой валидации (422)
export interface ApiValidationError {
  message: string;
  errors: Record<string, string[]>;
}

// Стандартный ответ API с обычной ошибкой (403, 500 и т.д.)
export interface ApiError {
  message: string;
  exception?: string;
  file?: string;
  line?: number;
  trace?: unknown[];
}

/**
 * Общий тип юзера для отображения в UI-компонентах (UserBadge и т.д.).
 *
 * Используется во всех хуках: TransactionUser, GiftUser, StaffMember,
 * StaffCandidate, SearchUserItem, BroadcastItem.target_user/admin и т.д.
 *
 * created_at — ОПЦИОНАЛЬНЫЙ: не все API возвращают это поле (например,
 * search-users не возвращает). UserBadge его не использует, но StaffMember
 * наследует и использует для отображения "даты регистрации".
 */
export interface UserBadgeData {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  is_online: boolean;
  status: string;
  deleted_at: string | null;
  has_active_premium: boolean;
  has_active_vip: boolean;
  is_verified: boolean;
  // Опциональные поля — не все API их возвращают.
  created_at?: string | null;
}

// ============================================================
// Пагинация (общие типы для всех списков)
// ============================================================
//
// В проекте ровно две формы пагинированных ответов бэкенда:
//
//   1. LaravelPaginated<T> — «плоская» (дефолт Laravel ->paginate()):
//      { data, total, current_page, last_page, per_page, from, to }
//      Так отвечают /admin/users, per-user списки (reports, blocks,
//      photos, ban-history) и т.п.
//
//   2. MetaPaginated<T> — «обёрнутая» (контроллеры модерации сами
//      собирают meta): { data: T[], meta: ListMeta, ...доп. поля
//      (stats, status, counts — зависят от раздела) }
//      Так отвечают /admin/photos, /admin/diary, /admin/reports и др.
//
// Новые API-модули обязаны использовать эти generic-типы вместо
// переопределения одинаковых интерфейсов в каждом файле.

/** Мета-блок пагинации (форма «meta» в ответах контроллеров модерации). */
export interface ListMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

/** «Плоский» пагинированный ответ (дефолт Laravel ->paginate()). */
export interface LaravelPaginated<T> {
  data: T[];
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
  from: number | null;
  to: number | null;
}

/** Пагинированный ответ с meta-блоком (контроллеры модерации). */
export interface MetaPaginated<T> {
  data: T[];
  meta: ListMeta;
}