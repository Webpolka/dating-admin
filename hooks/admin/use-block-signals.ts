// hooks/admin/use-block-signals.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { extractErrorMessage } from "@/lib/api";

// ===== Типы =====
export type BlockSignalUser = {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  is_online: boolean;
  status: "active" | "banned" | "shadowbanned" | "deactivated";
  deleted_at: string | null;
  has_active_premium: boolean;
  has_active_vip: boolean;
  is_verified: boolean;
  total_blocks_count: number;
  recent_blocks_count: number;
  // ISO timestamp последней блокировки — для отображения «когда последний раз
  // его заблокировали». null только если UserBlock'ов нет вообще (что при
  // havingRaw threshold >= 2 невозможно, но тип перестраховывается).
  last_block_at: string | null;
};

export type BlockSignalCounts = {
  total: number;   // юзеры с ≥3 блокировок
  medium: number;  // 3-9 блокировок
  high: number;    // ≥10 блокировок
  danger: number;  // ≥5 за последние 7 дней
};

export type BlockSignalsListResponse = {
  data: BlockSignalUser[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  threshold: number;
  // Counts убраны из list response — см. useBlockSignalCounts (stable queryKey).
};

export type BlockSignalListParams = {
  q?: string;
  threshold?: number;
  page?: number;
  per_page?: number;
};

export type Blocker = {
  id: number;
  reason: string | null;
  reason_label: string | null;
  reason_color: string | null;
  created_at: string | null;
  blocker: {
    id: number;
    name: string;
    email: string;
    avatar_url: string | null;
    is_online: boolean;
    status: "active" | "banned" | "shadowbanned" | "deactivated";
    deleted_at: string | null;
    has_active_premium: boolean;
    has_active_vip: boolean;
    is_verified: boolean;
  } | null;
};

export type BlockersListResponse = {
  data: Blocker[];
  user_id: number;
};

// ===== Хуки чтения =====
export function useBlockSignalsList(params: BlockSignalListParams) {
  return useQuery<BlockSignalsListResponse>({
    queryKey: ["admin", "block-signals", params],
    queryFn: async ({ queryKey }) => {
      const [, , p] = queryKey as [string, string, BlockSignalListParams];
      const search = new URLSearchParams();
      if (p.q) search.set("q", p.q);
      if (p.threshold) search.set("threshold", String(p.threshold));
      if (p.page) search.set("page", String(p.page));
      if (p.per_page) search.set("per_page", String(p.per_page));
      const { data } = await api.get<BlockSignalsListResponse>(
        `/admin/block-signals?${search.toString()}`
      );
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });
}

/**
 * Stable query для counts — не зависит от filter/search/page/threshold.
 * QueryKey ["admin","block-signals","counts"] не меняется → counts не скачут
 * при смене порога или страницы. Раньше counts были в list-response →
 * каждая page-loading перезаписывала их.
 *
 * refetchInterval 30s — автообновление счётчиков, чтобы админ видел
 * новые «опасные» юзеры без перезагрузки страницы.
 */
export function useBlockSignalCounts() {
  return useQuery<{ stats: BlockSignalCounts }>({
    queryKey: ["admin", "block-signals", "counts"],
    queryFn: async () => {
      const { data } = await api.get<{ stats: BlockSignalCounts }>(
        `/admin/block-signals/counts`
      );
      return data;
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useBlockersList(userId: number | null, enabled: boolean) {
  return useQuery<BlockersListResponse>({
    queryKey: ["admin", "block-signals", "blockers", userId],
    queryFn: async () => {
      const { data } = await api.get<BlockersListResponse>(
        `/admin/block-signals/${userId}/blockers`
      );
      return data;
    },
    enabled: enabled && !!userId,
    staleTime: 30_000,
  });
}

// ===== Хуки действий =====
export function useBanBlockSignal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, type }: { userId: number; type: "shadow" | "temp" | "permanent" }) => {
      const { data } = await api.post<{ message: string }>(
        `/admin/block-signals/${userId}/ban`,
        { type }
      );
      return data;
    },
    onSuccess: (data) => {
      // Backend может вернуть 200 + message "уже забанен" (idempotency early-return)
      // — это успех, не ошибка. Toast всё равно покажет message.
      toast.success(data.message);
      // Инвалидируем: список (бан сменил status юзера в строке) + counts
      // (юзер мог попасть/выпасть из «опасных» по новому статусу).
      qc.invalidateQueries({ queryKey: ["admin", "block-signals"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка бана пользователя")),
  });
}
