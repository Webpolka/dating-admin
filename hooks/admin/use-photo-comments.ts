// hooks/admin/use-photo-comments.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { extractErrorMessage } from "@/lib/api";

// ===== Типы =====
//
// Стратегия модерации (Вариант A):
//   - Статусов 3: pending / approved / rejected. Спам — это причина отклонения, не статус.
//   - Виртуальный «karantine» — это soft-deleted запись (trashed=true), в БД статуса нет.
//   - Причины отклонения (только при status='rejected'):
//       пользовательские — profanity / insult / off_topic / spam / other
//       системная        — parent_rejected (каскад от rejected-родителя)
//
// API-контракт строго соответствует backend'у:
//   - POST /admin/photo-comments/{id}/reject  body { reason } — единственный путь отклонить.
//   /spam endpoint убран: чтобы пометить спамом, модератор выбирает «Спам» в dropdown причины.
export type PhotoCommentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "karantine"; // виртуальный — soft-deleted

export type PhotoCommentRejectReason =
  // Пользовательские (модератор выбирает в dropdown)
  | "profanity"
  | "insult"
  | "off_topic"
  | "spam"
  | "other"
  // Системные (каскад от rejected-родителя)
  | "parent_rejected";

// Юзер на карточке (упрощённый)
export type CommentUser = {
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
};

// Один комментарий (root или ответ)
export type PhotoCommentItem = {
  id: number;
  photo_id: number;
  user_id: number | null;
  parent_id: number | null;
  content: string;
  status: PhotoCommentStatus;
  reject_reason: string | null;
  moderated_by: number | null;
  moderated_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  trashed: boolean;
  is_pinned: boolean;
  likes_count: number;
  replies_count: number;
  // Сводка о родителе — нужна фронту для guard'а кликабельности:
  // прятать кнопку restore/approve на дочернем, если родитель rejected/trashed.
  // Для корневых комментариев (parent_id === null) — всегда null.
  parent: { id: number; status: string; trashed: boolean } | null;
  user: CommentUser | null;
  replies: PhotoCommentItem[];
};

// Фото с деревом комментариев
export type PhotoWithComments = {
  id: number;
  user_id: number | null;
  is_primary: boolean;
  is_intimate: boolean;
  status: string;
  trashed: boolean;
  thumb_url: string;
  medium_url: string;
  large_url: string;
  original_url: string;
  album: { id: number; name: string } | null;
  user: CommentUser | null;
  pending_count: number;
  comments: PhotoCommentItem[];
};

export type PhotoCommentCounts = {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  karantine: number;
  total: number;
};

type PhotoCommentsListResponse = {
  mode: "list";
  data: PhotoWithComments[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  stats: PhotoCommentCounts;
  status: PhotoCommentStatus | "all";
};

type PhotoCommentsListParams = {
  status: PhotoCommentStatus | "all";
  q?: string;
  page?: number;
  per_page?: number;
};

// ===== Хуки чтения =====
export function usePhotoCommentsList(params: PhotoCommentsListParams) {
  return useQuery<PhotoCommentsListResponse>({
    queryKey: ["admin", "photo-comments", params],
    queryFn: async ({ queryKey }) => {
      const [, , p] = queryKey as [string, string, PhotoCommentsListParams];
      const search = new URLSearchParams();
      search.set("status", p.status);
      if (p.q) search.set("q", p.q);
      if (p.page) search.set("page", String(p.page));
      if (p.per_page) search.set("per_page", String(p.per_page));
      const { data } = await api.get<PhotoCommentsListResponse>(
        `/admin/photo-comments?${search.toString()}`
      );
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 0,
  });
}

/**
 * Stable query для counts — не зависит от filter/search/page.
 * QueryKey ["admin","photo-comments","counts"] не меняется при смене вкладок →
 * counts не скачут (как в photos, stop-words, support-chats).
 *
 * refetchInterval: 30 сек — auto-refresh для moderation queue.
 * staleTime: 10 сек.
 * placeholderData: (prev) => prev — нет мерцания.
 */
export function usePhotoCommentCounts() {
  return useQuery<{ stats: PhotoCommentCounts }>({
    queryKey: ["admin", "photo-comments", "counts"],
    queryFn: async () => {
      const { data } = await api.get<{ stats: PhotoCommentCounts }>(
        `/admin/photo-comments/counts`
      );
      return data;
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}

// ===== Хуки одиночных действий =====
export function useApproveComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(
        `/admin/photo-comments/${id}/approve`
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "photo-comments"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка одобрения комментария")),
  });
}

export function useRejectComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      reason,
    }: {
      id: number;
      reason: PhotoCommentRejectReason;
    }) => {
      const { data } = await api.post<{ message: string }>(
        `/admin/photo-comments/${id}/reject`,
        { reason }
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "photo-comments"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка отклонения комментария")),
  });
}

export function useSoftDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(
        `/admin/photo-comments/${id}/soft-delete`
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "photo-comments"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка перемещения в карантин")),
  });
}

export function useRestoreComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(
        `/admin/photo-comments/${id}/restore`
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "photo-comments"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка восстановления комментария")),
  });
}

export function useDestroyComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<{ message: string }>(
        `/admin/photo-comments/${id}`
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "photo-comments"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка удаления комментария")),
  });
}

// ===== Хуки действий по фото =====
export function useApproveRemainingComments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (photoId: number) => {
      const { data } = await api.post<{ count: number; message: string }>(
        `/admin/photo-comments/photo/${photoId}/approve-remaining`
      );
      return data;
    },
    onSuccess: (data) => {
      if (data.count > 0) toast.success(data.message);
      else toast.info(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "photo-comments"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка массового одобрения")),
  });
}

export function useRejectRemainingComments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (photoId: number) => {
      const { data } = await api.post<{ count: number; message: string }>(
        `/admin/photo-comments/photo/${photoId}/reject-remaining`
      );
      return data;
    },
    onSuccess: (data) => {
      if (data.count > 0) toast.success(data.message);
      else toast.info(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "photo-comments"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка массового отклонения")),
  });
}

// ===== Хуки глобальных действий =====
export function useApproveAllPendingComments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ count: number; message: string }>(
        `/admin/photo-comments/approve-all`
      );
      return data;
    },
    onSuccess: (data) => {
      if (data.count > 0) toast.success(data.message);
      else toast.info(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "photo-comments"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка массового одобрения")),
  });
}

export function useRejectAllPendingComments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ count: number; message: string }>(
        `/admin/photo-comments/reject-all`
      );
      return data;
    },
    onSuccess: (data) => {
      if (data.count > 0) toast.success(data.message);
      else toast.info(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "photo-comments"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка массового отклонения")),
  });
}

// extractErrorMessage — используем глобальный из lib/api.ts.

// ===== Лейблы причин отказа (для UI — dropdown) =====
//
// Только ПОЛЬЗОВАТЕЛЬСКИЕ причины — те, что модератор может выбрать в dropdown.
// parent_rejected (системная, ставится бэкендом при каскаде) сюда НЕ входит:
// модератор не может её выбрать, но UI её отображает на уже отклонённых каскадных ответах.
export const COMMENT_REJECT_REASONS: Array<{
  value: PhotoCommentRejectReason;
  label: string;
  color: string;
}> = [
  { value: "profanity", label: "Мат / Нецензурная лексика", color: "bg-red-500/10 text-red-500" },
  { value: "insult", label: "Оскорбление", color: "bg-destructive/10 text-destructive" },
  { value: "off_topic", label: "Не по теме", color: "bg-yellow-500/10 text-yellow-500" },
  { value: "spam", label: "Спам", color: "bg-orange-500/10 text-orange-500" },
  { value: "other", label: "Другое", color: "bg-secondary text-secondary-foreground" },
];

// Лейбл причины по значению (для бейджа на отклонённом комментарии).
// Включает системную parent_rejected — чтобы UI мог её отобразить на каскадных детях.
export function getCommentRejectReasonLabel(reason: string | null): string | null {
  if (!reason) return null;

  const allReasons: Record<string, string> = {
    profanity: "Мат / Нецензурная лексика",
    insult: "Оскорбление",
    off_topic: "Не по теме",
    spam: "Спам",
    other: "Другое",
    parent_rejected: "Отклонён (по родителю)",
  };

  return allReasons[reason] ?? reason;
}

// Цвет причины по значению (для бейджа).
export function getCommentRejectReasonColor(reason: string | null): string | null {
  if (!reason) return null;

  const allColors: Record<string, string> = {
    profanity: "bg-red-500/10 text-red-500",
    insult: "bg-destructive/10 text-destructive",
    off_topic: "bg-yellow-500/10 text-yellow-500",
    spam: "bg-orange-500/10 text-orange-500",
    other: "bg-secondary text-secondary-foreground",
    // Нейтральный синий для каскадной причины — это не «вина» автора,
    // а автоматическое решение по родителю.
    parent_rejected: "bg-blue-500/10 text-blue-500",
  };

  return allColors[reason] ?? null;
}
