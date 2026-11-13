// hooks/admin/use-gifts.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { extractErrorMessage } from "@/lib/api";
import type { UserBadgeData } from "@/lib/types";

// ===== Типы =====
export type GiftCategory = "romantic" | "cars" | "male" | "female" | "18+" | "fun";
export type GiftType = "main" | "premium" | "services";

export type GiftItem = {
  id: number;
  name: string;
  slug: string;
  image_url: string;
  raw_image: string;
  price: number;
  category: string;
  category_label: string | null;
  category_color: string | null;
  type: GiftType;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

// F3: GiftUser теперь = UserBadgeData из lib/types. Раньше был отдельный
// тип с теми же полями → приводил к `as unknown as UserBadgeData` касту
// в компонентах при передаче в <UserBadge>.
export type GiftUser = UserBadgeData;

export type UserGiftItem = {
  id: number;
  snapshot_name: string;
  snapshot_image_url: string;
  snapshot_price: number;
  message: string | null;
  is_private: boolean;
  is_read: boolean;
  is_hidden: boolean;
  created_at: string | null;
  sender: GiftUser | null;
  receiver: GiftUser | null;
  gift: {
    id: number;
    name: string;
    image_url: string;
    type: GiftType;
    category: string | null;
    category_label: string | null;
    category_color: string | null;
  } | null;
};

export type GiftsListResponse = {
  data: GiftItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  counts: {
    catalog: number;
    history: number;
    all: number;
    public: number;
    private: number;
  };
};

export type HistoryListResponse = {
  data: UserGiftItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  counts: {
    catalog: number;
    history: number;
    all: number;
    public: number;
    private: number;
  };
};

export type GiftsListParams = {
  q?: string;
  category?: string;
  type?: string;
  page?: number;
  per_page?: number;
};

export type HistoryListParams = {
  q?: string;
  privacy?: string;
  page?: number;
  per_page?: number;
};

export type GiftFormData = {
  name: string;
  slug: string;
  image_url: string;
  price: number;
  category: GiftCategory | null;
  type: GiftType;
  is_active: boolean;
};

// ===== Хуки: Каталог =====

/**
 * Список подарков с фильтрами + поиск по name/slug/id.
 * staleTime: 15 сек — подарки меняются нечасто, держим короткий TTL
 * для актуальности при переключении табов.
 */
export function useGiftsList(params: GiftsListParams) {
  return useQuery<GiftsListResponse>({
    queryKey: ["admin", "gifts", params],
    queryFn: async ({ queryKey }) => {
      const [, , p] = queryKey as [string, string, GiftsListParams];
      const search = new URLSearchParams();
      if (p.q) search.set("q", p.q);
      if (p.category && p.category !== "all") search.set("category", p.category);
      if (p.type && p.type !== "all") search.set("type", p.type);
      if (p.page) search.set("page", String(p.page));
      if (p.per_page) search.set("per_page", String(p.per_page));
      const { data } = await api.get<GiftsListResponse>(`/admin/gifts?${search.toString()}`);
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });
}

export function useCreateGift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: GiftFormData) => {
      const { data } = await api.post<{ message: string; data: GiftItem }>(`/admin/gifts`, payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "gifts"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка создания подарка")),
  });
}

export function useUpdateGift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: GiftFormData }) => {
      const { data } = await api.put<{ message: string; data: GiftItem }>(`/admin/gifts/${id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "gifts"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка обновления подарка")),
  });
}

export function useDeleteGift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<{ message: string; deleted: boolean; sent_count: number }>(`/admin/gifts/${id}`);
      return data;
    },
    onSuccess: (data) => {
      if (data.deleted) {
        toast.success(data.message);
      } else {
        toast.warning(data.message);
      }
      qc.invalidateQueries({ queryKey: ["admin", "gifts"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка удаления подарка")),
  });
}

export function useToggleGiftStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string; is_active: boolean }>(`/admin/gifts/${id}/toggle`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "gifts"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка смены статуса")),
  });
}

// ===== Хуки: История дарений =====

/**
 * История дарений с фильтром приватности + поиск по имени/id.
 */
export function useGiftsHistoryList(params: HistoryListParams) {
  return useQuery<HistoryListResponse>({
    queryKey: ["admin", "gifts", "history", params],
    queryFn: async ({ queryKey }) => {
      const [, , , p] = queryKey as [string, string, string, HistoryListParams];
      const search = new URLSearchParams();
      if (p.q) search.set("q", p.q);
      if (p.privacy && p.privacy !== "all") search.set("privacy", p.privacy);
      if (p.page) search.set("page", String(p.page));
      if (p.per_page) search.set("per_page", String(p.per_page));
      const { data } = await api.get<HistoryListResponse>(`/admin/gifts/history?${search.toString()}`);
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });
}

export function useHideUserGift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(`/admin/gifts/history/${id}/hide`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "gifts"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка скрытия подарка")),
  });
}

export function useRestoreUserGift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(`/admin/gifts/history/${id}/restore`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "gifts"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка восстановления подарка")),
  });
}

// extractErrorMessage и extractValidationErrors теперь в lib/api.ts.
// Импортируйте их напрямую оттуда в компонентах.
export { extractValidationErrors } from "@/lib/api";