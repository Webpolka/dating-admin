// hooks/admin/use-dating.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { extractErrorMessage } from "@/lib/api";

// ===== Типы =====
export type DatingMode = "swipes" | "matches";
export type SwipeType = "like" | "dislike" | "superlike";
export type MatchStatus = "active" | "unmatched";

export type DatingUser = {
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

export type SwipeItem = {
  id: number;
  type: SwipeType;
  rewinded: boolean;
  created_at: string | null;
  user: DatingUser | null;
  targetUser: DatingUser | null;
};

export type MatchItem = {
  id: number;
  status: MatchStatus;
  unmatched_by: number | null;
  unmatched_at: string | null;
  created_at: string | null;
  user1: DatingUser | null;
  user2: DatingUser | null;
};

export type DatingStats = {
  total_likes: number;
  total_dislikes: number;
  total_superlikes: number;
  total_swipes: number;
  total_matches: number;
};

type DatingListResponse = {
  mode: DatingMode;
  data: SwipeItem[] | MatchItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  stats: DatingStats;
  filters: {
    type: string;
    q: string;
    dateFrom: string;
    dateTo: string;
  };
};

type DatingListParams = {
  mode: DatingMode;
  type?: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  per_page?: number;
};

// ===== Хуки чтения =====
export function useDatingList(params: DatingListParams) {
  return useQuery<DatingListResponse>({
    queryKey: ["admin", "dating", params],
    queryFn: async ({ queryKey }) => {
      const [, , p] = queryKey as [string, string, DatingListParams];
      const search = new URLSearchParams();
      search.set("mode", p.mode);
      if (p.type && p.type !== "all") search.set("type", p.type);
      if (p.q) search.set("q", p.q);
      if (p.dateFrom) search.set("dateFrom", p.dateFrom);
      if (p.dateTo) search.set("dateTo", p.dateTo);
      if (p.page) search.set("page", String(p.page));
      if (p.per_page) search.set("per_page", String(p.per_page));
      const { data } = await api.get<DatingListResponse>(
        `/admin/dating?${search.toString()}`
      );
      return data;
    },
    placeholderData: (prev) => prev, // soft loading при смене таба/фильтра
    staleTime: 0,
  });
}

// ===== Хуки действий =====
export function useDestroySwipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<{ message: string }>(
        `/admin/dating/swipes/${id}`
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "dating"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка удаления свайпа")),
  });
}

export function useDestroyMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<{ message: string }>(
        `/admin/dating/matches/${id}`
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "dating"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка разрыва мэтча")),
  });
}

export function useRestoreMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(
        `/admin/dating/matches/${id}/restore`
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "dating"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка восстановления мэтча")),
  });
}

// extractErrorMessage — используем глобальный из lib/api.ts.

/**
 * Stable query для counts — не зависит от filter/search/page.
 * QueryKey ["admin","dating","counts"] не меняется при смене вкладок →
 * counts не скачут (как в photos, photo-comments, stop-words).
 *
 * refetchInterval: 30 сек — auto-refresh.
 * staleTime: 10 сек.
 * placeholderData: (prev) => prev — нет мерцания.
 */
export function useDatingCounts() {
  return useQuery<{ stats: DatingStats }>({
    queryKey: ["admin", "dating", "counts"],
    queryFn: async () => {
      const { data } = await api.get<{ stats: DatingStats }>(
        `/admin/dating/counts`
      );
      return data;
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}

// ===== UI маппинги для Enum'ов =====
export const SWIPE_TYPES: Record<
  SwipeType,
  { label: string; color: string }
> = {
  like: { label: "Лайк", color: "bg-green-500/10 text-green-500" },
  dislike: { label: "Дизлайк", color: "bg-red-500/10 text-red-500" },
  superlike: { label: "Суперлайк", color: "bg-yellow-500/10 text-yellow-500" },
};

export const MATCH_STATUSES: Record<
  MatchStatus,
  { label: string; color: string }
> = {
  active: { label: "Активен", color: "bg-green-500/10 text-green-500" },
  unmatched: { label: "Разорван", color: "bg-red-500/10 text-red-500" },
};