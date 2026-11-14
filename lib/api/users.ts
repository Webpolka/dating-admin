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
import type { DiaryItem } from "@/hooks/admin/use-diaries";
import type { SwipeItem, MatchItem } from "@/hooks/admin/use-dating";
import type { TransactionItem } from "@/hooks/admin/use-transactions";

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
// Бэкенд: GET /admin/users/{userId}/photos
// Контроллер: UserListingsController::photos() → composite-ответ
// {albums: AlbumItem[], counts: AlbumCounts}.
//
// Таб БЕЗ модерации — группировка по альбомам (один альбом = одна карточка).
// Без статус-табов и без пагинации: альбомов у юзера немного, отдаются все
// разом, фото внутри альбома — целиком (is_primary DESC, position ASC).
//
// Фото без album_id (orphan) — бэк группирует в виртуальный альбом с id=null,
// name='Без альбома' (последним в списке). Не теряем такие фото.
//
// Модерация фото (status/reject_reason/trashed/...) живёт в глобальной очереди
// /moderation/photos. Здесь фото-айтем — лёгкий формат без модераторских полей:
// только id, тип, is_primary, is_intimate, position, title/description, URLs, created_at.
//
// AlbumItem.photos_count — денормализованный счётчик из albums.photos_count
// (для orphan-альбома = реальное число фото в нём).

/** Лёгкая фото-запись внутри альбома (без модераторских полей). */
export interface AlbumPhotoItem {
  id: number;
  type: "profile" | "verification";
  is_primary: boolean;
  is_intimate: boolean;
  position: number;
  title: string | null;
  description: string | null;
  created_at: string | null;
  /** URL accessor'ы из Photo::$appends (path_* → Storage::url). */
  thumb_url: string;
  medium_url: string;
  large_url: string;
  original_url: string;
}

/** Альбом юзера (или виртуальный «Без альбома» для orphan-фото, id=null). */
export interface UserPhotoAlbumItem {
  /** null — виртуальный «Без альбома» (orphan-фото без album_id). */
  id: number | null;
  name: string;
  description: string | null;
  is_default: boolean;
  is_private: boolean;
  /** Денормализованный счётчик из albums.photos_count (для orphan — реальное число). */
  photos_count: number;
  created_at: string | null;
  /** ISO-8601 если альбом soft-deleted (видим для post-factum). null если жив. */
  deleted_at: string | null;
  photos: AlbumPhotoItem[];
}

/** Общие счётчики для шапки таба. */
export interface UserPhotoAlbumCounts {
  albums: number;
  photos_total: number;
  photos_primary: number;
  photos_intimate: number;
}

/** Composite-ответ таба «Фото» — список альбомов + общие счётчики. */
export interface UserPhotosResponse {
  albums: UserPhotoAlbumItem[];
  counts: UserPhotoAlbumCounts;
}

/**
 * Параметры запроса. Бэк не использует page/per_page (отдаёт все альбомы разом),
 * но они валидируются UserPhotosRequest для совместимости с общей фабрикой
 * useUserListing. На фронте params = {} — пустой объект, ключ реактивности —
 * только userId.
 */
export interface UserPhotosParams {
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

// --- Комм. фото (made / received — две колонки) ---

/**
 * Строка комментария в табе «Комм. фото» юзера.
 *
 * Поля `user` (автор комментария) и `photo` (контекст фото) добираются бэкендом
 * по-разному в зависимости от колонки:
 *   - made     → photo.user (владелец фото, под которым комментировал юзер).
 *   - received → user (автор комментария под фото нашего юзера), photo — только id.
 *
 * В made-колонке `user` — это сам userId (фронт его не рисует, но поле приходит).
 */
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
  user: UserBadgeData | null;
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

/** Внутренняя пагинация одной колонки (плоский Laravel-пагинатор). */
export interface UserPhotoCommentsPaginated {
  data: UserPhotoCommentItem[];
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
  from: number | null;
  to: number | null;
}

/**
 * Composite-ответ: две независимые пагинации + общие счётчики.
 * Зеркало UserReportsResponse / UserGiftsResponse.
 */
export interface UserPhotoCommentsResponse {
  made: UserPhotoCommentsPaginated;
  received: UserPhotoCommentsPaginated;
  counts: { made: number; received: number };
}

export interface UserPhotoCommentsParams {
  made_page?: number;
  received_page?: number;
}

// --- Дневники (автор = юзер) ---

/**
 * Структура дневника в пер-юзер табе = 1:1 с глобальным списком (DiaryItem).
 * `user` в пер-юзер табе всегда сам userId (фронт не рисует), но поле приходит.
 *
 * diary_rubric — рубрика записи (null = «Без рубрики»). Структура 1:1 с
 * глобальной очередью модерации /moderation/diary.
 */
export interface UserDiariesResponse extends LaravelPaginated<DiaryItem> {
  /** Рубрики, в которых у юзера реально есть посты — для кнопок фильтра. */
  rubrics: UserDiaryRubricFilter[];
  /** Текущий фильтр: 'all' | 'none' | id рубрики (число). */
  rubric: "all" | "none" | number;
  /** Текущий поисковый запрос (эхо). */
  search: string | null;
}

export interface UserDiariesParams {
  rubric?: "all" | "none" | number;
  search?: string;
  page?: number;
}

/**
 * Рубрика для кнопок фильтра в табе «Дневники».
 * Личные (is_personal=true, user_id != null) — рисуются с иконкой User,
 * глобальные (is_personal=false) — с Globe.
 */
export interface UserDiaryRubricFilter {
  id: number;
  name: string;
  is_active: boolean;
  is_personal: boolean;
  user_id: number | null;
}

// --- Комм. дневников (made / received — две колонки) ---

/**
 * Строка комментария к дневнику в пер-юзер табе.
 *
 * Контекстные поля добираются бэкендом по-разному в зависимости от колонки:
 *   - made     → diary.user (автор записи, под которой комментировал юзер).
 *   - received → user (автор комментария под записью нашего юзера) + diary (id/title).
 *
 * В made-колонке `user` — это сам userId (фронт не рисует, но поле приходит).
 */
export interface UserDiaryCommentItem {
  id: number;
  diary_id: number | null;
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
  user: UserBadgeData | null;
  diary: {
    id: number;
    title: string;
    status: string;
    trashed: boolean;
    user: UserBadgeData | null;
  } | null;
}

/** Внутренняя пагинация одной колонки (плоский Laravel-пагинатор). */
export interface UserDiaryCommentsPaginated {
  data: UserDiaryCommentItem[];
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
  from: number | null;
  to: number | null;
}

/**
 * Composite-ответ: две независимые пагинации + общие счётчики.
 * Зеркало UserReportsResponse / UserGiftsResponse / UserPhotoCommentsResponse.
 */
export interface UserDiaryCommentsResponse {
  made: UserDiaryCommentsPaginated;
  received: UserDiaryCommentsPaginated;
  counts: { made: number; received: number };
}

export interface UserDiaryCommentsParams {
  made_page?: number;
  received_page?: number;
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

/**
 * Строка чата в per-user табе. В отличие от глобального ChatListItem,
 * здесь оператор видит «собеседника» (partner ≠ текущий юзер), а не обоих
 * участников, плюс participant-поля юзера для бейджей строки.
 *
 * Структура 1:1 с UserListingsController::formatChatParticipantRow().
 */
export interface UserChatItem {
  /** ID записи ChatParticipant (для ключа React, не chat.id). */
  participant_id: number;
  chat: {
    id: number;
    /** 'private' | 'support' — для бейджа типа чата. */
    type: string;
    is_locked: boolean;
    last_message_at: string | null;
    last_message: {
      id: number;
      type: string;
      body: string;
      created_at: string | null;
    } | null;
  } | null;
  /** Собеседник — другой участник ≠ userId. AdminUserBadgeResource-формат. */
  partner: UserBadgeData | null;
  /** Состояние юзера в этом чате (для бейджей строки). */
  participant_state: {
    unread_count: number;
    is_hidden: boolean;
    is_muted: boolean;
    is_blocked: boolean;
    last_read_at: string | null;
  };
}

export type UserChatsResponse = LaravelPaginated<UserChatItem>;

export interface UserChatsParams {
  page?: number;
}

// --- Лента событий юзера ---

/**
 * Метаданные события для рендера таймлайна.
 *
 * Зеркало blade-эталона: бэк строит meta из App\Enums\V1\UserEventType
 * (UserListingsController::eventMeta): label()/icon()/color(). Для типов,
 * отсутствующих в enum — fallback: title=ucfirst(str_replace('_',' ',$type)),
 * icon='activity', color='bg-primary/10 text-primary'.
 *
 * icon — строковое имя lucide-иконки (фронт рендерит через ICON_MAP).
 * color — tailwind-класс круга-иконки (фон + цвет), например
 *   'bg-blue-500/10 text-blue-500'.
 */
export interface UserEventMeta {
  title: string;
  icon: string;
  color: string;
}

export interface UserEventItem {
  id: number;
  type: string;
  properties: Record<string, unknown> | null;
  created_at: string | null;
  /** Метаданные для таймлайна (заголовок/иконка/цвет из enum). */
  meta: UserEventMeta;
}

export type UserEventsResponse = LaravelPaginated<UserEventItem>;

export interface UserEventsParams {
  page?: number;
}

// --- Финансы юзера: composite {balance, statuses, transactions, subscriptions} ---

/**
 * Транзакция без поля user — автор всегда юзер страницы.
 * Формат 1:1 с глобальной очередью /finance/transactions (TransactionItem).
 */
export type UserTransactionItem = Omit<TransactionItem, "user">;

/**
 * Подписка юзера (UserSubscription). Зеркало blade-эталона: tier-бейдж,
 * название тарифа, срок, чек (transaction_id), статус-бейдж + дата события.
 */
export interface UserSubscriptionItem {
  id: number;
  plan_id: number;
  transaction_id: number | null;
  tier: "premium" | "vip";
  status: "active" | "expired" | "canceled" | "failed";
  status_badge: { variant: string; label: string };
  is_auto_renew: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  plan: {
    id: number;
    tier: "premium" | "vip";
    name: string;
    price: number;
    currency: string;
    duration_days: number;
  } | null;
}

/** Скалярный блок баланса (UserBalance). */
export interface UserBalancePayload {
  credits: number;
  superlikes_remaining: number;
  superlikes_reset_at: string | null;
}

/** Скалярный блок активных статусов (Premium/VIP). */
export interface UserStatusesPayload {
  has_active_premium: boolean;
  premium_expires_at: string | null;
  has_active_vip: boolean;
  vip_expires_at: string | null;
}

/**
 * Composite-ответ «финансового дашборда» юзера.
 *
 *   balance        — credits + superlikes_remaining.
 *   statuses        — active Premium/VIP (для карточки статусов сверху).
 *   transactions    — история транзакций, по 5 на страницу (trans_page).
 *   subscriptions    — история подписок, по 5 на страницу (sub_page).
 *
 * Зеркало UserReportsResponse / UserGiftsResponse: две независимые пагинации
 * в одном запросе.
 */
export interface UserFinancesResponse {
  balance: UserBalancePayload;
  statuses: UserStatusesPayload;
  transactions: LaravelPaginated<UserTransactionItem>;
  subscriptions: LaravelPaginated<UserSubscriptionItem>;
}

export interface UserFinancesParams {
  trans_page?: number;
  sub_page?: number;
}

// --- Подарки юзера: единый список с фильтром по направлению ---

/**
 * Строка подарка (UserGift) в per-user табе.
 *
 * Поле `direction` ('sent' | 'received') добавлено — фронт по нему рисует
 * стрелку направления и выбирает counterpart (получателя для sent,
 * отправителя для received). В режиме filter=all в одном списке могут быть
 * оба направления одновременно.
 *
 * Имя `UserGiftTabItem` (а не UserGiftItem) — чтобы не конфликтовать с
 * глобальным типом UserGiftItem из hooks/admin/use-gifts.ts (используется
 * в /finance/gifts → history). Пер-юзер таб добавляет direction, глобальный
 * список — нет.
 */
export interface UserGiftTabItem {
  id: number;
  /** 'sent' = юзер отправитель, 'received' = юзер получатель. */
  direction: "sent" | "received";
  snapshot_name: string;
  snapshot_image_url: string;
  snapshot_price: number;
  message: string | null;
  is_private: boolean;
  is_read: boolean;
  /** Soft-deleted (скрыт юзером) — withTrashed() на бэке. */
  is_hidden: boolean;
  created_at: string | null;
  sender: UserBadgeData | null;
  receiver: UserBadgeData | null;
  gift: {
    id: number;
    name: string;
    image_url: string;
    type: string;
    category: string;
    category_label: string | null;
    category_color: string | null;
  } | null;
}

/**
 * Single-list с фильтром. Раньше тут был composite sent/received с двумя
 * пагинациями — но blade-эталон использует именно single-list с кнопками
 * фильтра (all|sent|received), одна пагинация.
 */
export interface UserGiftsResponse extends LaravelPaginated<UserGiftTabItem> {
  /** Счётчики по направлениям — для бейджей на кнопках фильтра. */
  counts: { all: number; sent: number; received: number };
  /** Текущий фильтр (эхо). */
  filter: "all" | "sent" | "received";
}

export interface UserGiftsParams {
  filter?: "all" | "sent" | "received";
  page?: number;
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

export type UserBroadcastsResponse = LaravelPaginated<UserBroadcastItem> & {
  /** Счётчики по каналам — для бейджей на кнопках фильтра. */
  counts: { all: number; in_app: number; email: number; push: number };
  /** Текущий фильтр (эхо). */
  filter: "all" | "in_app" | "push" | "email";
};

export interface UserBroadcastsParams {
  filter?: "all" | "in_app" | "push" | "email";
  page?: number;
}

// --- Логи админов по юзеру (таймлайн с before/after + meta) ---

/**
 * Метаданные записи AdminLog для рендера таймлайна.
 *
 * Зеркало blade-эталона `\App\Support\AdminLogMeta::get($action)`:
 *   - title       — человекочитаемый заголовок действия.
 *   - icon        — имя lucide-иконки (фронт рендерит динамически).
 *   - iconColor   — tailwind-класс фона/цвета круга-иконки.
 *   - badge       — {variant, label} для бейджа действия.
 */
export interface UserAdminLogMeta {
  title: string;
  icon: string;
  iconColor: string;
  badge: { variant: string; label: string };
}

/**
 * Строка журнала AdminLog в per-user табе.
 *
 * В отличие от глобального AdminLogResource (используется в /system/admin-log),
 * здесь не нужен object_type/object_url — контекст уже «действия над этим
 * юзером». Зато добавлен `meta` (title/icon/badge), который глобальный журнал
 * считает на фронте, а per-user таб получает готовым с бэка.
 */
export interface UserAdminLogItem {
  id: number;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string | null;
  /** Метаданные для таймлайна (заголовок/иконка/бейдж). */
  meta: UserAdminLogMeta;
  admin: { id: number; name: string; email: string } | null;
}

export type UserAdminLogsResponse = LaravelPaginated<UserAdminLogItem>;

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

  getFinances: async (
    userId: number,
    params: UserFinancesParams,
  ): Promise<UserFinancesResponse> => {
    const { data } = await api.get(`/admin/users/${userId}/finances`, { params });
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