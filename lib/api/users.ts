// lib/api/users.ts
//
// API-слой вкладки Users админки.
// Синхронизирован с dating-api: app/Http/Controllers/Api/Admin/UserController.php.
//
// ВАЖНО: все типы здесь описывают ФАКТИЧЕСКИЙ JSON-ответ бэкенда.
// Если меняешь поля в UserController / UserDetailResource / UserBadgeResource —
// обнови соответствующие интерфейсы здесь, иначе TypeScript будет врать.

import api from "@/lib/api";
import type { LaravelPaginated, UserBadgeData } from "@/lib/types";

// Реюз доменных типов из хуков (единый источник правды для форматов
// глобальных списков — per-user ответы бэкенда совместимы с ними 1:1).
import type { PhotoItem } from "@/hooks/admin/use-photos";
import type { DiaryItem } from "@/hooks/admin/use-diaries";
import type { SwipeItem, MatchItem } from "@/hooks/admin/use-dating";
import type { TransactionItem } from "@/hooks/admin/use-transactions";
import type { UserGiftItem } from "@/hooks/admin/use-gifts";
import type { ChatListItem } from "@/hooks/admin/use-chats";

// ============================================================
// ТИПЫ: бан / разбан / деактивация
// ============================================================

export type BanType = "shadow" | "temp" | "permanent";

// Синхронизировано с App\Enums\BanReason (backend).
export type BanReason =
  | "spam"
  | "scam"
  | "prostitution"
  | "minor"
  | "insult"
  | "drugs"
  | "multi_account"
  | "other";

// Синхронизировано с App\Enums\DeletionReason (backend).
export type DeletionReason =
  | "user_request"
  | "test_account"
  | "duplicate"
  | "underage"
  | "scam"
  | "other";

// Русские лейблы причин бана — 1:1 с BanReason::label() в бэке.
export const BAN_REASONS: { value: BanReason; label: string }[] = [
  { value: "spam", label: "Спам / Реклама" },
  { value: "scam", label: "Мошенничество" },
  { value: "prostitution", label: "Проституция" },
  { value: "minor", label: "Несовершеннолетний" },
  { value: "insult", label: "Оскорбление / Харм" },
  { value: "drugs", label: "Пропаганда наркотиков" },
  { value: "multi_account", label: "Мультиаккаунт" },
  { value: "other", label: "Другое" },
];

// Русские лейблы причин деактивации — 1:1 с DeletionReason::label() в бэке.
export const DELETION_REASONS: { value: DeletionReason; label: string }[] = [
  { value: "user_request", label: "По просьбе пользователя" },
  { value: "test_account", label: "Тестовый аккаунт" },
  { value: "duplicate", label: "Дубль-аккаунт" },
  { value: "underage", label: "Несовершеннолетний" },
  { value: "scam", label: "Мошенничество" },
  { value: "other", label: "Другое" },
];

// Пресеты длительности временного бана (дней).
// Бэкенд валидирует days как integer 1..365, null = исторические 3 дня.
export const BAN_DURATION_PRESETS: { value: number; label: string }[] = [
  { value: 1, label: "1 день" },
  { value: 3, label: "3 дня (по умолчанию)" },
  { value: 7, label: "7 дней" },
  { value: 14, label: "14 дней" },
  { value: 30, label: "30 дней" },
  { value: 60, label: "60 дней" },
  { value: 90, label: "90 дней" },
  { value: 180, label: "180 дней" },
  { value: 365, label: "365 дней" },
];

// ============================================================
// ТИПЫ: список пользователей
// ============================================================

// Строка таблицы списка — ответ GET /admin/users (UserController::index).
export interface AdminUserListItem extends UserBadgeData {
  phone: string | null;
  banned_until: string | null;
  ban_reason: string | null;
  gender: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  last_seen: string | null;
}

export interface UsersListParams {
  q?: string;
  status?: string;
  gender?: string;
  sub?: string;
  sort?: "asc" | "desc";
  verified?: string;
  page?: number;
  per_page?: number;
}

// Стандартная Laravel-пагинация.
export interface UsersListResponse {
  data: AdminUserListItem[];
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
  from: number | null;
  to: number | null;
}

// Счётчики — ответ GET /admin/users/stats.
export interface UsersStats {
  total: number;
  banned: number;
  shadowbanned: number;
  vip: number;
  premium: number;
  verified: number;
}

// ============================================================
// ТИПЫ: детальный профиль (UserDetailResource)
// ============================================================

export type ProfileField = "headline" | "bio" | "looking_for";

export interface UserProfileDetail {
  gender: string | null;
  age: number | null;
  birth_date: string | null;
  headline: string | null;
  bio: string | null;
  looking_for: string | null;
  dating_goals: string[] | null;
  zodiac_sign: number | null; // accessor, вычисляется из birth_date
  body_type: number | null;
  eye_color: number | null;
  hair_color: number | null;
  height: number | null;
  weight: number | null;
  body_decorations: number[] | null;
  relationship_status: number | null;
  children_status: number | null;
  pets: number | null;
  housing: number | null;
  has_car: number | null;
  smoking: number | null;
  alcohol: number | null;
  self_portrait: Record<string, string> | null;
  education_level: number | null;
  income: number | null;
  institution: string | null;
  institution_year: number | null;
  activity: string | null;
  position: string | null;
  sports: number[] | null;
  interests: Array<{ id: number; name: string; slug: string }> | null;
  languages: number[] | null;
  country: string | null;
  state: string | null;
  city: string | null;
}

export interface UserPreferencesDetail {
  preferred_gender: string | null;
  preferred_age_min: number | null;
  preferred_age_max: number | null;
  preferred_distance_km: number | null;
  search_filters: Record<string, unknown> | null;
  visibility_gender: string | null;
  visibility_age_min: number | null;
  visibility_age_max: number | null;
  chat_filter_enabled: boolean;
  chat_filter_settings: {
    gender?: string;
    age_from?: number;
    age_to?: number;
    is_verified_only?: boolean;
    is_premium_only?: boolean;
  } | null;
  is_invisible: boolean;
  hide_from_search: boolean;
  hide_intimate: boolean;
  disable_photo_comments: boolean;
}

// Ответ GET /admin/users/{id} (UserDetailResource).
export interface UserDetail {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_online: boolean;
  status: string;
  deleted_at: string | null;
  is_verified: boolean;
  has_completed_onboarding: boolean;
  email_verified_at: string | null;
  has_active_premium: boolean;
  premium_expires_at: string | null;
  has_active_vip: boolean;
  vip_expires_at: string | null;
  last_seen: string | null;
  last_login_ip: string | null;
  last_login_at: string | null;
  created_at: string;
  banned_until: string | null;
  ban_reason: string | null;
  profile: UserProfileDetail | null;
  preferences: UserPreferencesDetail | null;
}

// ============================================================
// ТИПЫ: история банов (пагинированная)
// ============================================================

// Строка истории — AdminLog из UserController::banHistory.
export interface BanHistoryEntry {
  id: number;
  action: string; // 'user.ban' | 'user.unban' | 'user.shadowban' | 'user.delete' | 'user.restore' | ...
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  admin: { id: number; name: string } | null;
}

export interface BanHistoryParams {
  page?: number;
  per_page?: number;
}

// Форма ответа banHistory: {data: [...], total, current_page, ...}
export interface BanHistoryPaginated {
  data: BanHistoryEntry[];
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
  from: number | null;
  to: number | null;
}

// ============================================================
// ТИПЫ: сессии
// ============================================================

// Форма ответа ManageUserSessionsAction::getUserSessions().
export interface UserSession {
  id: string;
  ip: string | null;
  device: string;
  browser: string;
  is_mobile: boolean;
  last_activity: string; // "5 минут назад" (diffForHumans на бэке)
  exact_time: string; // "12.11.2026 15:30:00"
}

// ============================================================
// ТИПЫ: жалобы
// ============================================================

export interface ReportListItem {
  id: number;
  reason: string | null;
  description: string | null;
  status: "pending" | "resolved" | "rejected" | null;
  resolution: string | null;
  resolution_note: string | null;
  reportable_type: string | null; // "Photo" | "Diary" | "User" | ...
  reportable_id: number | null;
  admin: { id: number; name: string } | null;
  user: UserBadgeData | null; // reported (в "made") или reporter (в "received")
  created_at: string | null;
  resolved_at: string | null;
}

export interface ReportsPaginated {
  data: ReportListItem[];
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
  from: number | null;
  to: number | null;
}

export interface UserReportsResponse {
  made: ReportsPaginated;
  received: ReportsPaginated;
}

export interface UserReportsParams {
  made_page?: number;
  received_page?: number;
}

// ============================================================
// ТИПЫ: блокировки
// ============================================================

export interface UserBlockListItem {
  id: number;
  reason: string | null;
  user: UserBadgeData | null; // blocked (в "blocked") или blocker (в "blockers")
  created_at: string | null;
}

export interface UserBlocksPaginated {
  data: UserBlockListItem[];
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
  from: number | null;
  to: number | null;
}

export interface UserBlocksResponse {
  blocked: UserBlocksPaginated;
  blockers: UserBlocksPaginated;
}

export interface UserBlocksParams {
  blocked_page?: number;
  blockers_page?: number;
}

// ============================================================
// ТИПЫ: фото пользователя (таб «Фото» на странице /users/[id])
// ============================================================
//
// Бэкенд: GET /admin/users/{userId}/photos?status=pending&page=2
// Контроллер: UserController::photos() → возвращает {data, counts, status},
// где data — PhotoPaginator (структура идентична ReportsPaginated /
// UserBlocksPaginated), counts — счётчики по 4 статусам для табов.
//
// Фото-айтем — это ImageItem из hooks/admin/use-photos.ts (PhotoItem).
// Здесь НЕ дублируем тип, а реэкспортируем — единственный источник правды
// остаётся use-photos.ts (как раньше). Если позже PhotoItem переедет
// в lib/api/users.ts — обновим импорт здесь.
//
// Status-табы: pending | approved | rejected | quarantine.
// quarantine ≠ status='rejected'. Карантин = soft-deleted (deleted_at IS NOT NULL),
// status при этом может быть любым. Зеркалит PhotoController::getCounts().

export type UserPhotoStatus = "pending" | "approved" | "rejected" | "quarantine";

export interface UserPhotosPaginated {
  data: PhotoItem[];
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
  from: number | null;
  to: number | null;
}

/** Счётчики по 4 статусам для статус-табов. Зеркалит PhotoController::getCounts(). */
export interface UserPhotoCounts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  quarantine: number;
}

export interface UserPhotosResponse {
  data: UserPhotosPaginated;
  counts: UserPhotoCounts;
  status: UserPhotoStatus;
}

export interface UserPhotosParams {
  status?: UserPhotoStatus;
  page?: number;
}

// ============================================================
// ТИПЫ: пер-юзер листинги табов страницы пользователя
// (UserListingsController на бэке)
// ============================================================
//
// Форма ответов — «плоский» Laravel-пагинатор LaravelPaginated<T>
// + опциональные counts (для статус-табов) и эхо фильтра.
// Доменные айтемы (дневники, свайпы, мэтчи, транзакции, подарки,
// чаты) реюзают типы глобальных списков — форматы 1:1.

// --- Комм. фото (автор = юзер) ---

export type UserCommentTabStatus =
  | "all" | "pending" | "approved" | "rejected" | "spam" | "karantine";

export interface UserPhotoCommentItem {
  id: number;
  photo_id: number | null;
  parent_id: number | null;
  content: string;
  status: "pending" | "approved" | "rejected" | "spam";
  reject_reason: string | null;
  moderated_by: number | null;
  moderated_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  trashed: boolean;
  is_pinned: boolean;
  likes_count: number;
  replies_count: number;
  photo: {
    id: number;
    user_id: number;
    status: string;
    is_primary: boolean;
    trashed: boolean;
    thumb_url: string | null;
    medium_url: string | null;
    user: UserBadgeData | null;
  } | null;
}

export interface UserCommentTabCounts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  spam: number;
  karantine: number;
}

export interface UserPhotoCommentsResponse extends LaravelPaginated<UserPhotoCommentItem> {
  counts: UserCommentTabCounts;
  status: UserCommentTabStatus;
}

export interface UserPhotoCommentsParams {
  status?: UserCommentTabStatus;
  page?: number;
}

// --- Дневники (автор = юзер) ---

export type UserDiaryTabStatus = "all" | "draft" | "pending" | "published" | "rejected";
export type UserDiaryTrashedFilter = "with" | "only" | "without";

export interface UserDiaryCounts {
  all: number;
  published: number;
  pending: number;
  rejected: number;
  draft: number;
  trashed: number;
}

export interface UserDiariesResponse extends LaravelPaginated<DiaryItem> {
  counts: UserDiaryCounts;
  status: UserDiaryTabStatus;
  trashed: UserDiaryTrashedFilter;
}

export interface UserDiariesParams {
  status?: UserDiaryTabStatus;
  trashed?: UserDiaryTrashedFilter;
  page?: number;
}

// --- Комм. дневников (автор = юзер) ---

export interface UserDiaryCommentItem {
  id: number;
  diary_id: number;
  parent_id: number | null;
  content: string;
  status: "pending" | "approved" | "rejected" | "spam";
  reject_reason: string | null;
  moderated_by: number | null;
  moderated_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  trashed: boolean;
  likes_count: number;
  replies_count: number;
  diary: {
    id: number;
    title: string;
    status: string;
    trashed: boolean;
    user: UserBadgeData | null;
  } | null;
}

export interface UserDiaryCommentsResponse extends LaravelPaginated<UserDiaryCommentItem> {
  counts: UserCommentTabCounts;
  status: UserCommentTabStatus;
}

export interface UserDiaryCommentsParams {
  status?: UserCommentTabStatus;
  page?: number;
}

// --- Знакомства (свайпы + мэтчи юзера, две пагинации) ---

/** Свайп юзера: автор — сам юзер страницы, поэтому поля user нет. */
export type UserSwipeItem = Omit<SwipeItem, "user">;

export interface UserDatingCounts {
  swipes: number;
  likes: number;
  dislikes: number;
  superlikes: number;
  matches: number;
}

export interface UserDatingResponse {
  swipes: LaravelPaginated<UserSwipeItem>;
  matches: LaravelPaginated<MatchItem>;
  counts: UserDatingCounts;
}

export interface UserDatingParams {
  swipes_page?: number;
  matches_page?: number;
}

// --- Чаты юзера ---

export type UserChatsResponse = LaravelPaginated<ChatListItem>;

export interface UserChatsParams {
  page?: number;
}

// --- Лента событий юзера ---

export interface UserEventItem {
  id: number;
  type: string;
  properties: Record<string, unknown> | null;
  created_at: string | null;
}

export type UserEventsResponse = LaravelPaginated<UserEventItem>;

export interface UserEventsParams {
  page?: number;
}

// --- Финансы: транзакции юзера ---

export type UserTransactionTabStatus = "all" | "success" | "pending" | "failed" | "refunded";

/** Транзакция без поля user — автор всегда юзер страницы. */
export type UserTransactionItem = Omit<TransactionItem, "user">;

export interface UserTransactionCounts {
  all: number;
  success: number;
  pending: number;
  failed: number;
  refunded: number;
}

export interface UserTransactionsResponse extends LaravelPaginated<UserTransactionItem> {
  counts: UserTransactionCounts;
  status: UserTransactionTabStatus;
}

export interface UserTransactionsParams {
  status?: UserTransactionTabStatus;
  page?: number;
}

// --- Подарки юзера (отправленные + полученные, две пагинации) ---

export interface UserGiftsResponse {
  sent: LaravelPaginated<UserGiftItem>;
  received: LaravelPaginated<UserGiftItem>;
  counts: { sent: number; received: number };
}

export interface UserGiftsParams {
  sent_page?: number;
  received_page?: number;
}

// --- Карты юзера ---

export interface UserCardItem {
  id: number;
  gateway: string;
  card_type: string | null;
  last4: string | null;
  expiry_month: string | null;
  expiry_year: string | null;
  is_active: boolean;
  is_default: boolean;
  is_expired: boolean;
  trashed: boolean;
  created_at: string | null;
  deleted_at: string | null;
}

export type UserCardsResponse = LaravelPaginated<UserCardItem>;

export interface UserCardsParams {
  page?: number;
}

// --- Промокоды юзера ---

export interface UserPromocodeItem {
  id: number;
  applied_discount: number;
  created_at: string | null;
  promo_code: {
    id: number;
    code: string;
    discount_type: "percent" | "fixed" | "premium" | "vip";
    discount_value: number;
    duration_days: number | null;
    expires_at: string | null;
    is_active: boolean;
  } | null;
  transaction: {
    id: number;
    amount: number;
    status: string;
    type: string;
    created_at: string | null;
  } | null;
}

export type UserPromocodesResponse = LaravelPaginated<UserPromocodeItem>;

export interface UserPromocodesParams {
  page?: number;
}

// --- Рассылки, адресованные юзеру ---

export interface UserBroadcastItem {
  id: number;
  title: string;
  message: string;
  type: string;
  status: string;
  progress: number;
  sent_count: number;
  failed_count: number;
  total_recipients: number;
  scheduled_at: string | null;
  sent_at: string | null;
  started_at: string | null;
  created_at: string | null;
  audience_label: string;
  admin: { id: number; name: string } | null;
}

export type UserBroadcastsResponse = LaravelPaginated<UserBroadcastItem>;

export interface UserBroadcastsParams {
  page?: number;
}

// --- Логи админов по юзеру (формат строк = BanHistoryEntry) ---

export type UserAdminLogsResponse = LaravelPaginated<BanHistoryEntry>;

export interface UserAdminLogsParams {
  page?: number;
}

// --- История входов юзера ---

export type UserAuthLogOutcome = "all" | "success" | "failed";

export interface UserAuthLogItem {
  id: number;
  ip_address: string;
  user_agent: string | null;
  device_os: string | null;
  device_type: string | null;
  is_successful: boolean;
  created_at: string | null;
}

export interface UserAuthLogsResponse extends LaravelPaginated<UserAuthLogItem> {
  counts: { total: number; success: number; failed: number };
  outcome: UserAuthLogOutcome;
}

export interface UserAuthLogsParams {
  outcome?: UserAuthLogOutcome;
  page?: number;
}

// ============================================================
// API-МЕТОДЫ
// ============================================================

export const usersApi = {
  // --- Список ---

  getUsers: async (params: UsersListParams): Promise<UsersListResponse> => {
    const { data } = await api.get("/admin/users", { params });
    return data;
  },

  getStats: async (): Promise<UsersStats> => {
    const { data } = await api.get("/admin/users/stats");
    return data;
  },

  // --- Мутации статуса ---

  /**
   * Забанить пользователя.
   *
   * @param days Длительность в днях — ТОЛЬКО для type="temp" (бэкенд:
   *             валидация integer 1..365). null/undefined = 3 дня (дефолт бэка).
   */
  ban: async (
    userId: number,
    type: BanType,
    reason: BanReason,
    days?: number,
  ): Promise<{ message: string }> => {
    const payload: { type: BanType; reason: BanReason; days?: number } = { type, reason };
    if (type === "temp" && days) {
      payload.days = days;
    }
    const { data } = await api.post(`/admin/users/${userId}/ban`, payload);
    return data;
  },

  unban: async (userId: number): Promise<{ message: string }> => {
    const { data } = await api.post(`/admin/users/${userId}/unban`);
    return data;
  },

  deactivate: async (userId: number, reason: DeletionReason): Promise<{ message: string }> => {
    // DELETE с телом: axios отправляет тело через { data } в конфиге.
    const { data } = await api.delete(`/admin/users/${userId}`, { data: { reason } });
    return data;
  },

  restore: async (userId: number): Promise<{ message: string }> => {
    const { data } = await api.post(`/admin/users/${userId}/restore`);
    return data;
  },

  // --- Детальный профиль ---

  getDetail: async (userId: number): Promise<UserDetail> => {
    const { data } = await api.get(`/admin/users/${userId}`);
    return data;
  },

  clearProfileField: async (
    userId: number,
    field: ProfileField,
  ): Promise<{ message: string }> => {
    const { data } = await api.post(`/admin/users/${userId}/profile/clear-field`, { field });
    return data;
  },

  // --- История банов (пагинированная) ---

  getBanHistory: async (
    userId: number,
    params?: BanHistoryParams,
  ): Promise<BanHistoryPaginated> => {
    const { data } = await api.get(`/admin/users/${userId}/ban-history`, { params });
    return data;
  },

  // --- Сессии ---

  getSessions: async (userId: number): Promise<UserSession[]> => {
    const { data } = await api.get(`/admin/users/${userId}/sessions`);
    return data.sessions;
  },

  killSession: async (userId: number, sessionId: string): Promise<{ message: string }> => {
    const { data } = await api.post(`/admin/users/${userId}/sessions/kill`, {
      session_id: sessionId,
    });
    return data;
  },

  killAllSessions: async (userId: number): Promise<{ message: string; count: number }> => {
    const { data } = await api.post(`/admin/users/${userId}/sessions/kill-all`);
    return data;
  },

  // --- Жалобы ---

  getReports: async (
    userId: number,
    params: UserReportsParams,
  ): Promise<UserReportsResponse> => {
    const { data } = await api.get(`/admin/users/${userId}/reports`, { params });
    return data;
  },

  // --- Блокировки ---

  getBlocks: async (
    userId: number,
    params: UserBlocksParams,
  ): Promise<UserBlocksResponse> => {
    const { data } = await api.get(`/admin/users/${userId}/blocks`, { params });
    return data;
  },

  unblockUser: async (userId: number, blockId: number): Promise<{ message: string }> => {
    const { data } = await api.post(`/admin/users/${userId}/blocks/unblock`, {
      block_id: blockId,
    });
    return data;
  },

  // --- Фото (per-user листинг для таба «Фото») ---
  // Модерация (approve/reject/...) живёт в /admin/photos/{id}/* — общий путь
  // с глобальной очередью модерации. Здесь только листинг per-user.

  getPhotos: async (
    userId: number,
    params: UserPhotosParams,
  ): Promise<UserPhotosResponse> => {
    const { data } = await api.get(`/admin/users/${userId}/photos`, { params });
    return data;
  },

  // --- Пер-юзер листинги табов (UserListingsController) ---
  // Все read-only; мутации — через глобальные разделы модерации/финансов.

  getPhotoComments: async (
    userId: number,
    params: UserPhotoCommentsParams,
  ): Promise<UserPhotoCommentsResponse> => {
    const { data } = await api.get(`/admin/users/${userId}/photo-comments`, { params });
    return data;
  },

  getDiaries: async (
    userId: number,
    params: UserDiariesParams,
  ): Promise<UserDiariesResponse> => {
    const { data } = await api.get(`/admin/users/${userId}/diaries`, { params });
    return data;
  },

  getDiaryComments: async (
    userId: number,
    params: UserDiaryCommentsParams,
  ): Promise<UserDiaryCommentsResponse> => {
    const { data } = await api.get(`/admin/users/${userId}/diary-comments`, { params });
    return data;
  },

  getDating: async (
    userId: number,
    params: UserDatingParams,
  ): Promise<UserDatingResponse> => {
    const { data } = await api.get(`/admin/users/${userId}/dating`, { params });
    return data;
  },

  getChats: async (
    userId: number,
    params: UserChatsParams,
  ): Promise<UserChatsResponse> => {
    const { data } = await api.get(`/admin/users/${userId}/chats`, { params });
    return data;
  },

  getEvents: async (
    userId: number,
    params: UserEventsParams,
  ): Promise<UserEventsResponse> => {
    const { data } = await api.get(`/admin/users/${userId}/events`, { params });
    return data;
  },

  getTransactions: async (
    userId: number,
    params: UserTransactionsParams,
  ): Promise<UserTransactionsResponse> => {
    const { data } = await api.get(`/admin/users/${userId}/transactions`, { params });
    return data;
  },

  getGifts: async (
    userId: number,
    params: UserGiftsParams,
  ): Promise<UserGiftsResponse> => {
    const { data } = await api.get(`/admin/users/${userId}/gifts`, { params });
    return data;
  },

  getCards: async (
    userId: number,
    params: UserCardsParams,
  ): Promise<UserCardsResponse> => {
    const { data } = await api.get(`/admin/users/${userId}/cards`, { params });
    return data;
  },

  getPromocodes: async (
    userId: number,
    params: UserPromocodesParams,
  ): Promise<UserPromocodesResponse> => {
    const { data } = await api.get(`/admin/users/${userId}/promocodes`, { params });
    return data;
  },

  getBroadcasts: async (
    userId: number,
    params: UserBroadcastsParams,
  ): Promise<UserBroadcastsResponse> => {
    const { data } = await api.get(`/admin/users/${userId}/broadcasts`, { params });
    return data;
  },

  getAdminLogs: async (
    userId: number,
    params: UserAdminLogsParams,
  ): Promise<UserAdminLogsResponse> => {
    const { data } = await api.get(`/admin/users/${userId}/admin-logs`, { params });
    return data;
  },

  getAuthLogs: async (
    userId: number,
    params: UserAuthLogsParams,
  ): Promise<UserAuthLogsResponse> => {
    const { data } = await api.get(`/admin/users/${userId}/auth-logs`, { params });
    return data;
  },
};