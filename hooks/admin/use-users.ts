"use client";

// hooks/admin/use-users.ts
//
// TanStack Query-хуки вкладки Users.
//
// Конвенция query-ключей (важно для инвалидации):
//   ["users"]                     — список (все страницы и фильтры)
//   ["users-stats"]               — счётчики
//   ["user-detail", userId]       — детальный профиль
//   ["user-ban-history", userId, page] — история банов
//   ["user-sessions", userId]     — сессии
//   ["user-reports", userId, params]   — жалобы
//   ["user-blocks", userId, params]    — блокировки
//   ["user-photos", userId, params]    — фото (per-user листинг)
//   ["user-photo-comments", userId, params] и т.д. — пер-юзер
//   листинги табов (UserListingsController): diaries, diary-comments,
//   dating, chats, events, transactions, gifts, broadcasts, admin-logs,
//   cards, promocodes, auth-logs.
//
// Все мутации статуса (бан/разбан/деактивация/восстановление) инвалидируют
// СРАЗУ ВСЕ связанные ключи через префикс — не нужно помнить, что обновить.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/api";
import {
  usersApi,
  type UsersListParams,
  type BanType,
  type BanReason,
  type DeletionReason,
  type ProfileField,
  type BanHistoryParams,
  type UserReportsParams,
  type UserBlocksParams,
  type UserPhotosParams,
  type UserPhotoCommentsParams,
  type UserDiariesParams,
  type UserDiaryCommentsParams,
  type UserDatingParams,
  type UserChatsParams,
  type UserEventsParams,
  type UserTransactionsParams,
  type UserGiftsParams,
  type UserCardsParams,
  type UserPromocodesParams,
  type UserBroadcastsParams,
  type UserAdminLogsParams,
  type UserAuthLogsParams,
} from "@/lib/api/users";

// ============================================================
// ЗАПРОСЫ (queries)
// ============================================================

export function useUsers(params: UsersListParams, enabled = true) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => usersApi.getUsers(params),
    placeholderData: (prev) => prev, // не мигает при смене страницы/фильтров
    staleTime: 15_000,
    enabled,
  });
}

export function useUsersStats() {
  return useQuery({
    queryKey: ["users-stats"],
    queryFn: usersApi.getStats,
    staleTime: 30_000,
    refetchInterval: 60_000, // лёгкий авто-рефреш счётчиков
  });
}

export function useUserDetail(userId: number) {
  return useQuery({
    queryKey: ["user-detail", userId],
    queryFn: () => usersApi.getDetail(userId),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useUserBanHistory(userId: number, params?: BanHistoryParams) {
  return useQuery({
    queryKey: ["user-ban-history", userId, params],
    queryFn: () => usersApi.getBanHistory(userId, params),
    enabled: !!userId,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useUserSessions(userId: number) {
  return useQuery({
    queryKey: ["user-sessions", userId],
    queryFn: () => usersApi.getSessions(userId),
    enabled: !!userId,
    staleTime: 15_000,
    refetchInterval: 30_000, // сессии живут своей жизнью — рефрешим
  });
}

export function useUserReports(userId: number, params: UserReportsParams, enabled = true) {
  return useQuery({
    queryKey: ["user-reports", userId, params],
    queryFn: () => usersApi.getReports(userId, params),
    placeholderData: (prev) => prev,
    staleTime: 15_000,
    enabled: enabled && !!userId,
  });
}

export function useUserBlocks(userId: number, params: UserBlocksParams, enabled = true) {
  return useQuery({
    queryKey: ["user-blocks", userId, params],
    queryFn: () => usersApi.getBlocks(userId, params),
    placeholderData: (prev) => prev,
    staleTime: 15_000,
    enabled: enabled && !!userId,
  });
}

/**
 * Фото пользователя для таба «Фото» (per-user листинг).
 *
 * ВАЖНО про инвалидацию: мутации фото (approve/reject/soft-delete/restore/
 * destroy/set-primary/approve-all/reject-all) живут в hooks/admin/use-photos.ts
 * и инвалидируют ключ ["admin","photos"] (глобальную очередь модерации).
 * Чтобы пер-юзер таб тоже обновлялся после мутации, эти хуки
 * ДОПОЛНИТЕЛЬНО инвалидируют ["user-photos", userId] (см. use-photos.ts,
 * патч ЧАСТИ 7). Без этого таб бы показывал stale-данные после действия.
 *
 * placeholderData: prev — soft loading при смене статуса/страницы,
 * чтобы карточки не мигали.
 */
export function useUserPhotos(userId: number, params: UserPhotosParams, enabled = true) {
  return useQuery({
    queryKey: ["user-photos", userId, params],
    queryFn: () => usersApi.getPhotos(userId, params),
    placeholderData: (prev) => prev,
    staleTime: 15_000,
    enabled: enabled && !!userId,
  });
}

// ============================================================
// ПЕР-ЮЗЕР ЛИСТИНГИ (табы страницы пользователя)
// ============================================================

/**
 * Фабрика query-хуков для пер-юзер листингов (UserListingsController).
 *
 * Все 13 табов имеют одинаковую конфигурацию:
 *   - ключ ["<tab>", userId, params];
 *   - placeholderData: prev — мягкая смена страницы/фильтра (без мигания);
 *   - staleTime 15с — как у остальных пер-юзер данных;
 *   - enabled-гард (таб может быть скрыт по роли/статусу).
 *
 * Мутаций здесь нет by design: действия выполняются в глобальных
 * разделах (модерация/финансы), их хуки сами инвалидируют
 * пер-юзер ключи (см. use-photos.ts, «патч ЧАСТИ 7»).
 */
function useUserListing<TResponse, TParams>(
  queryKey: string,
  fetcher: (userId: number, params: TParams) => Promise<TResponse>,
  userId: number,
  params: TParams,
  enabled = true,
) {
  return useQuery({
    queryKey: [queryKey, userId, params],
    queryFn: () => fetcher(userId, params),
    placeholderData: (prev) => prev,
    staleTime: 15_000,
    enabled: enabled && !!userId,
  });
}

export const useUserPhotoComments = (
  userId: number,
  params: UserPhotoCommentsParams,
  enabled = true,
) => useUserListing("user-photo-comments", usersApi.getPhotoComments, userId, params, enabled);

export const useUserDiaries = (
  userId: number,
  params: UserDiariesParams,
  enabled = true,
) => useUserListing("user-diaries", usersApi.getDiaries, userId, params, enabled);

export const useUserDiaryComments = (
  userId: number,
  params: UserDiaryCommentsParams,
  enabled = true,
) => useUserListing("user-diary-comments", usersApi.getDiaryComments, userId, params, enabled);

export const useUserDating = (
  userId: number,
  params: UserDatingParams,
  enabled = true,
) => useUserListing("user-dating", usersApi.getDating, userId, params, enabled);

export const useUserChats = (
  userId: number,
  params: UserChatsParams,
  enabled = true,
) => useUserListing("user-chats", usersApi.getChats, userId, params, enabled);

export const useUserEvents = (
  userId: number,
  params: UserEventsParams,
  enabled = true,
) => useUserListing("user-events", usersApi.getEvents, userId, params, enabled);

export const useUserTransactions = (
  userId: number,
  params: UserTransactionsParams,
  enabled = true,
) => useUserListing("user-transactions", usersApi.getTransactions, userId, params, enabled);

export const useUserGifts = (
  userId: number,
  params: UserGiftsParams,
  enabled = true,
) => useUserListing("user-gifts", usersApi.getGifts, userId, params, enabled);

export const useUserCards = (
  userId: number,
  params: UserCardsParams,
  enabled = true,
) => useUserListing("user-cards", usersApi.getCards, userId, params, enabled);

export const useUserPromocodes = (
  userId: number,
  params: UserPromocodesParams,
  enabled = true,
) => useUserListing("user-promocodes", usersApi.getPromocodes, userId, params, enabled);

export const useUserBroadcasts = (
  userId: number,
  params: UserBroadcastsParams,
  enabled = true,
) => useUserListing("user-broadcasts", usersApi.getBroadcasts, userId, params, enabled);

export const useUserAdminLogs = (
  userId: number,
  params: UserAdminLogsParams,
  enabled = true,
) => useUserListing("user-admin-logs", usersApi.getAdminLogs, userId, params, enabled);

export const useUserAuthLogs = (
  userId: number,
  params: UserAuthLogsParams,
  enabled = true,
) => useUserListing("user-auth-logs", usersApi.getAuthLogs, userId, params, enabled);

// ============================================================
// МУТАЦИИ (mutations)
// ============================================================

/**
 * Общая обёртка мутаций, меняющих статус юзера.
 * После успеха: тост + инвалидация всех связанных списков.
 */
function useUserStatusMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<{ message: string }>,
  errorText: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users-stats"] });
      queryClient.invalidateQueries({ queryKey: ["user-detail"] });
      queryClient.invalidateQueries({ queryKey: ["user-ban-history"] });
    },
    onError: (err) => toast.error(extractErrorMessage(err, errorText)),
  });
}

export const useBanUser = () =>
  useUserStatusMutation(
    (v: { userId: number; type: BanType; reason: BanReason; days?: number }) =>
      usersApi.ban(v.userId, v.type, v.reason, v.days),
    "Ошибка при блокировке",
  );

export const useUnbanUser = () =>
  useUserStatusMutation((userId: number) => usersApi.unban(userId), "Ошибка при разблокировке");

export const useDeactivateUser = () =>
  useUserStatusMutation(
    (v: { userId: number; reason: DeletionReason }) => usersApi.deactivate(v.userId, v.reason),
    "Ошибка при деактивации",
  );

export const useRestoreUser = () =>
  useUserStatusMutation((userId: number) => usersApi.restore(userId), "Ошибка при восстановлении");

/** Очистка поля анкеты (headline / bio / looking_for). */
export const useClearProfileField = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { userId: number; field: ProfileField }) =>
      usersApi.clearProfileField(v.userId, v.field),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["user-detail"] });
    },
    onError: (err) => toast.error(extractErrorMessage(err, "Ошибка при очистке поля")),
  });
};

/** Завершить одну сессию юзера. */
export const useKillSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { userId: number; sessionId: string }) =>
      usersApi.killSession(v.userId, v.sessionId),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
    },
    onError: (err) => toast.error(extractErrorMessage(err, "Ошибка при завершении сессии")),
  });
};

/** Завершить ВСЕ сессии юзера (разлогинить везде). */
export const useKillAllSessions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => usersApi.killAllSessions(userId),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
    },
    onError: (err) => toast.error(extractErrorMessage(err, "Ошибка при завершении всех сессий")),
  });
};

/** Принудительно снять блокировку между юзерами. */
export const useUnblockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { userId: number; blockId: number }) =>
      usersApi.unblockUser(v.userId, v.blockId),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["user-blocks"] });
    },
    onError: (err) => toast.error(extractErrorMessage(err, "Ошибка при снятии блокировки")),
  });
};