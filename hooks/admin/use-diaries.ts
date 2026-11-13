// hooks/admin/use-diaries.ts
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { extractErrorMessage } from "@/lib/api";

// ===== Типы для Дневников (Постов) =====
export type DiaryStatus = "draft" | "pending" | "published" | "rejected";
export type TrashedFilter = "with" | "only" | "without";

export type DiaryUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  is_online: boolean;
  status: string;
  deleted_at: string | null;
  has_active_premium: boolean;
  has_active_vip: boolean;
  is_verified: boolean;
};

export type DiaryRubric = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  user_id: number | null;
  diaries_count: number;
  user: DiaryUser | null;
};

export type DiaryItem = {
  id: number;
  title: string;
  body?: string;
  status: DiaryStatus;
  reject_reason: string | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  trashed: boolean;
  is_comments_enabled: boolean;
  views_count: number;
  comments_count: number;
  likes_count: number;
  user: DiaryUser | null;
  diary_rubric: {
    id: number;
    name: string;
    is_active: boolean;
    is_personal: boolean;
    user_id: number | null;
  } | null;
};

export type AvailableRubric = {
  id: number;
  name: string;
  user_id: number | null;
  is_personal: boolean;
  is_active: boolean;
};

export type DiaryCounts = {
  all: number;
  published: number;
  pending: number;
  rejected: number;
  trashed: number;
  rubrics_count: number;
};

type DiariesListResponse = {
  tab: "diaries";
  data: DiaryItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  all_rubrics: { id: number; name: string; is_active: boolean }[];
  status: DiaryStatus | "all";
};

type DiariesListParams = {
  status: string;
  trashed?: TrashedFilter;
  rubric?: string;
  q?: string;
  page?: number;
  per_page?: number;
};

// ===== Типы для Комментарий (Вариант A — спам = причина, не статус) =====
//
// Стратегия модерации (симметрично с photo-comments):
//   - Статусов 3: pending / approved / rejected. Спам — это причина отклонения.
//   - Виртуальный «karantine» — soft-deleted (trashed=true), в БД статуса нет.
//   - Причины отклонения (только при status='rejected'):
//       пользовательские — profanity / insult / off_topic / spam / other
//       системная        — parent_rejected (каскад от rejected-родителя)
//
// API-контракт строго соответствует backend'у:
//   - POST /admin/diary-comments/{id}/reject  body { reason } — единственный путь отклонить.
//   /spam endpoint убран: чтобы пометить спамом, модератор выбирает «Спам» в dropdown.
export type DiaryCommentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "karantine"; // виртуальный — soft-deleted

export type DiaryCommentRejectReason =
  // Пользовательские (модератор выбирает в dropdown)
  | "profanity"
  | "insult"
  | "off_topic"
  | "spam"
  | "other"
  // Системная (каскад от rejected-родителя)
  | "parent_rejected";

export type DiaryCommentItem = {
  id: number;
  diary_id: number;
  user_id: number | null;
  parent_id: number | null;
  content: string;
  status: DiaryCommentStatus;
  reject_reason: string | null;
  moderated_by: number | null;
  moderated_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  trashed: boolean;
  likes_count: number;
  replies_count: number;
  // Сводка о родителе — нужна фронту для guard'а кликабельности:
  // прятать кнопку restore/approve на ребёнке, если родитель rejected/trashed.
  // Для корневых комментариев (parent_id === null) — всегда null.
  parent: { id: number; status: string; trashed: boolean } | null;
  user: DiaryUser | null;
  replies: DiaryCommentItem[];
};

export type DiaryWithComments = {
  id: number;
  title: string;
  diary_rubric: { id: number; name: string; is_active: boolean; is_personal: boolean; user_id: number | null } | null;
  user: DiaryUser | null;
  comments: DiaryCommentItem[];
};

export type DiaryCommentCounts = {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  karantine: number;
  total: number;
};

type DiaryCommentsListResponse = {
  data: DiaryWithComments[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  stats: DiaryCommentCounts;
  status: DiaryCommentStatus | "all";
};

type DiaryCommentsListParams = {
  status: DiaryCommentStatus | "all";
  q?: string;
  diary_id?: number;
  page?: number;
  per_page?: number;
};

// ============================================
// ХУКИ ЧТЕНИЯ: ДНЕВНИКИ
// ============================================

export function useDiariesList(params: DiariesListParams, options?: { enabled?: boolean }) {
  return useQuery<DiariesListResponse>({
    queryKey: ["admin", "diary", "list", params],
    queryFn: async ({ queryKey }) => {
      const [, , , p] = queryKey as [string, string, string, DiariesListParams];
      const search = new URLSearchParams();
      search.set("status", p.status);
      if (p.trashed) search.set("trashed", p.trashed);
      if (p.rubric && p.rubric !== "all") search.set("rubric", p.rubric);
      if (p.q) search.set("q", p.q);
      if (p.page) search.set("page", String(p.page));
      if (p.per_page) search.set("per_page", String(p.per_page));
      const { data } = await api.get<DiariesListResponse>(`/admin/diary?${search.toString()}`);
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 15_000,
    enabled: options?.enabled ?? true,
  });
}

export function useDiaryDetail(id: number | null, enabled: boolean) {
  return useQuery<{ data: DiaryItem; available_rubrics: AvailableRubric[] }>({
    queryKey: ["admin", "diary", "detail", id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/diary/${id}`);
      return data;
    },
    enabled: enabled && !!id,
    staleTime: 15_000,
  });
}

export function useDiaryCounts() {
  return useQuery<{ stats: DiaryCounts }>({
    queryKey: ["admin", "diary", "counts"],
    queryFn: async () => {
      const { data } = await api.get<{ stats: DiaryCounts }>(`/admin/diary/counts`);
      return data;
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}

// ============================================
// ХУКИ ЧТЕНИЯ: РУБРИКИ
// ============================================

export function useRubricsList(
  params: { q?: string; page?: number; per_page?: number },
  options?: { enabled?: boolean }
) {
  return useQuery<{
    tab: "rubrics";
    data: DiaryRubric[];
    meta: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
      from: number | null;
      to: number | null;
    };
    all_rubrics: { id: number; name: string; is_active: boolean }[];
  }>({
    queryKey: ["admin", "diary", "rubrics", params],
    queryFn: async ({ queryKey }) => {
      const [, , , p] = queryKey as [string, string, string, { q?: string; page?: number; per_page?: number }];
      const search = new URLSearchParams();
      search.set("tab", "rubrics");
      if (p.q) search.set("q", p.q);
      if (p.page) search.set("page", String(p.page));
      if (p.per_page) search.set("per_page", String(p.per_page));
      const { data } = await api.get(`/admin/diary?${search.toString()}`);
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 15_000,
    enabled: options?.enabled ?? true,
  });
}

export function useCheckRubricName(name: string, ignoreId?: number | null) {
  const [debouncedName, setDebouncedName] = useState(name.trim());

  useEffect(() => {
    const t = setTimeout(() => setDebouncedName(name.trim()), 300);
    return () => clearTimeout(t);
  }, [name]);

  const query = useQuery<{
    available: boolean;
    conflict_id?: number;
    conflict_name?: string;
  }>({
    queryKey: ["admin", "diary", "rubrics", "check-name", debouncedName, ignoreId ?? null],
    queryFn: async () => {
      const search = new URLSearchParams();
      search.set("name", debouncedName);
      if (ignoreId) search.set("ignore_id", String(ignoreId));
      const { data } = await api.get(`/admin/diary/rubrics/check-name?${search.toString()}`);
      return data;
    },
    enabled: debouncedName.length >= 2,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
    retry: false,
  });

  return {
    ...query.data,
    isChecking: query.isFetching && !query.data,
  } as {
    available?: boolean;
    conflict_id?: number;
    conflict_name?: string;
    isChecking: boolean;
  };
}

// ============================================
// ХУКИ ДЕЙСТВИЙ: ДНЕВНИКИ
// ============================================

export function useApproveDiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...meta }: { id: number; diary_rubric_id?: number | null; is_comments_enabled?: boolean }) => {
      const { data } = await api.post<{ message: string }>(`/admin/diary/${id}/approve`, meta);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "diary"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка одобрения")),
  });
}

export function useRejectDiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason, ...meta }: { id: number; reason: string; diary_rubric_id?: number | null; is_comments_enabled?: boolean }) => {
      const { data } = await api.post<{ message: string }>(`/admin/diary/${id}/reject`, { reason, ...meta });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "diary"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка отклонения")),
  });
}
export function useUnpublishDiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...meta }: { id: number; diary_rubric_id?: number | null; is_comments_enabled?: boolean }) => {
      const { data } = await api.post<{ message: string }>(`/admin/diary/${id}/unpublish`, meta);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "diary"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка снятия с публикации")),
  });
}

export function useUpdateDiarySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...meta }: { id: number; diary_rubric_id?: number | null; is_comments_enabled?: boolean }) => {
      const { data } = await api.post<{ message: string }>(`/admin/diary/${id}/settings`, meta);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "diary"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка сохранения настроек")),
  });
}

export function useSoftDeleteDiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(`/admin/diary/${id}/soft-delete`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "diary"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка удаления")),
  });
}

export function useRestoreDiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(`/admin/diary/${id}/restore`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "diary"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка восстановления")),
  });
}

export function useForceDeleteDiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<{ message: string }>(`/admin/diary/${id}`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "diary"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка удаления навсегда")),
  });
}

// ============================================
// ХУКИ ДЕЙСТВИЙ: РУБРИКИ
// ============================================

export function useStoreRubric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string; is_active?: boolean; sort_order?: number }) => {
      const { data } = await api.post<{ message: string; data: DiaryRubric }>(`/admin/diary/rubrics`, payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "diary"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка создания рубрики")),
  });
}

export function useUpdateRubric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number; name?: string; description?: string; is_active?: boolean; sort_order?: number }) => {
      const { data } = await api.put<{ message: string; data: DiaryRubric }>(`/admin/diary/rubrics/${id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "diary"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка обновления рубрики")),
  });
}

export function useDestroyRubric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reassignId }: { id: number; reassignId?: number | null }) => {
      const { data } = await api.delete<{ message: string }>(`/admin/diary/rubrics/${id}`, {
        data: { reassign_id: reassignId },
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "diary"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка удаления рубрики")),
  });
}

export function useToggleRubricStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(`/admin/diary/rubrics/${id}/toggle`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "diary"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка изменения статуса")),
  });
}

// ============================================
// ХУКИ ЧТЕНИЯ: КОММЕНТАРИИ
// ============================================

export function useDiaryCommentsList(params: DiaryCommentsListParams) {
  return useQuery<DiaryCommentsListResponse>({
    queryKey: ["admin", "diary-comments", params],
    queryFn: async ({ queryKey }) => {
      const [, , p] = queryKey as [string, string, DiaryCommentsListParams];
      const search = new URLSearchParams();
      search.set("status", p.status);
      if (p.q) search.set("q", p.q);
      if (p.diary_id) search.set("diary_id", String(p.diary_id));
      if (p.page) search.set("page", String(p.page));
      if (p.per_page) search.set("per_page", String(p.per_page));
      const { data } = await api.get<DiaryCommentsListResponse>(`/admin/diary-comments?${search.toString()}`);
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 0,
  });
}

/**
 * Stable query для counts — не зависит от filter/search/page.
 * refetchInterval: 30 сек — auto-refresh для moderation queue.
 * staleTime: 10 сек. placeholderData: (prev) => prev — нет мерцания.
 */
export function useDiaryCommentCounts() {
  return useQuery<{ stats: DiaryCommentCounts }>({
    queryKey: ["admin", "diary-comments", "counts"],
    queryFn: async () => {
      const { data } = await api.get<{ stats: DiaryCommentCounts }>(`/admin/diary-comments/counts`);
      return data;
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}

// ============================================
// ХУКИ ДЕЙСТВИЙ: КОММЕНТАРИИ
// ============================================

export function useApproveDiaryComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(`/admin/diary-comments/${id}/approve`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "diary-comments"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка одобрения")),
  });
}

export function useRejectDiaryComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: DiaryCommentRejectReason }) => {
      const { data } = await api.post<{ message: string }>(`/admin/diary-comments/${id}/reject`, { reason });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "diary-comments"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка отклонения")),
  });
}

export function useSoftDeleteDiaryComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(`/admin/diary-comments/${id}/soft-delete`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "diary-comments"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка перемещения в карантин")),
  });
}

export function useRestoreDiaryComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(`/admin/diary-comments/${id}/restore`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "diary-comments"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка восстановления")),
  });
}

export function useDestroyDiaryComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<{ message: string }>(`/admin/diary-comments/${id}`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "diary-comments"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка удаления комментария")),
  });
}

// ===== UI маппинги для Enum'ов =====
export const DIARY_STATUS_BADGES: Record<string, { variant: string; label: string }> = {
  draft: { variant: "secondary", label: "Черновик" },
  pending: { variant: "warning", label: "Модерация" },
  published: { variant: "success", label: "Опубликован" },
  rejected: { variant: "destructive", label: "Отклонён" },
};

// ===== Лейблы причин отказа комментариев (для UI — dropdown) =====
//
// Только ПОЛЬЗОВАТЕЛЬСКИЕ причины — те, что модератор может выбрать в dropdown.
// parent_rejected (системная, ставится бэкендом при каскаде) сюда НЕ входит:
// модератор не может её выбрать, но UI её отображает на уже отклонённых каскадных ответах.
//
// Симметрично с photo-comments: profanity / insult / off_topic / spam / other.
// spam теперь это причина (не статус) — выбирается в dropdown наравне с остальными.
export const COMMENT_REJECT_REASONS: Array<{
  value: DiaryCommentRejectReason;
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

// Причины отклонения дневника (постов) — синхронизированы с DiaryRejectReason enum на бэке.
export const DIARY_REJECT_REASONS: Array<{ value: string; label: string; color: string }> = [
  { value: "spam", label: "Спам / Реклама", color: "bg-yellow-500/10 text-yellow-500" },
  { value: "porn", label: "Порнография / 18+", color: "bg-red-500/10 text-red-500" },
  { value: "scam", label: "Мошенничество", color: "bg-orange-500/10 text-orange-500" },
  { value: "insult", label: "Оскорбление", color: "bg-destructive/10 text-destructive" },
  { value: "other", label: "Другое", color: "bg-secondary text-secondary-foreground" },
];