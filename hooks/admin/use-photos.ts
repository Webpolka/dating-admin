// hooks/admin/use-photos.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { extractErrorMessage } from "@/lib/api";
import type { PhotoRejectReason } from "@/lib/photos";

// Реэкспорт причин отказа из lib/photos.ts (ЧАСТЬ 7: вынесено для консистентности
// с lib/blocks.ts и lib/reports.ts). Обратно-совместимо — moderation/photos
// и PhotoCard продолжают импортировать PHOTO_REJECT_REASONS / getRejectReasonLabel
// / PhotoRejectReason отсюда. Новые потребители должны импортировать из @/lib/photos.
export {
  PHOTO_REJECT_REASONS,
  getRejectReasonLabel,
  type PhotoRejectReason,
} from "@/lib/photos";

// ===== Типы =====
export type PhotoStatus = "pending" | "approved" | "rejected";
export type PhotoMode = "queue" | "grid";

// PhotoRejectReason теперь импортируется из @/lib/photos (см. реэкспорт выше).

// Юзер на карточке фото (упрощённый — для шапки)
export type PhotoUser = {
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

export type PhotoAlbum = { id: number; name: string } | null;

export type PhotoItem = {
  id: number;
  user_id: number;
  status: PhotoStatus;
  is_primary: boolean;
  is_intimate: boolean;
  type: "profile" | "verification";
  reject_reason: string | null;
  trashed: boolean;
  moderated_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  thumb_url: string;
  medium_url: string;
  large_url: string;
  original_url: string;
  album: PhotoAlbum;
  user?: PhotoUser | null;
};

// Карточка юзера в режиме очереди
export type UserCard = {
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
  pending_photos_count: number;
  created_at: string | null;
  photos: PhotoItem[];
};

export type PhotoCounts = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  quarantine: number;
};

type PhotosListResponse = {
  mode: PhotoMode;
  data: UserCard[] | PhotoItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  stats: PhotoCounts;
  status: PhotoStatus | "quarantine";
};

type PhotosListParams = {
  status: PhotoStatus | "quarantine" | "all";
  q?: string;
  page?: number;
  per_page?: number;
};

// ===== Хуки чтения =====
export function usePhotosList(params: PhotosListParams) {
  return useQuery<PhotosListResponse>({
    queryKey: ["admin", "photos", params],
    queryFn: async ({ queryKey }) => {
      const [, , p] = queryKey as [string, string, PhotosListParams];
      const search = new URLSearchParams();
      search.set("status", p.status);
      if (p.q) search.set("q", p.q);
      if (p.page) search.set("page", String(p.page));
      if (p.per_page) search.set("per_page", String(p.per_page));
      const { data } = await api.get<PhotosListResponse>(
        `/admin/photos?${search.toString()}`
      );
      return data;
    },
    placeholderData: (prev) => prev, // soft loading — не мигаем при смене таба
    staleTime: 0,
  });
}

/**
 * Stable query для counts — не зависит от filter/search/page.
 * QueryKey ["admin","photos","counts"] не меняется при смене вкладок →
 * counts не скачут (как было в support-chats и stop-words).
 *
 * refetchInterval: 30 сек — auto-refresh для moderation queue.
 * staleTime: 10 сек — разумная freshness.
 */
export function usePhotoCounts() {
  return useQuery<{ stats: PhotoCounts }>({
    queryKey: ["admin", "photos", "counts"],
    queryFn: async () => {
      const { data } = await api.get<{ stats: PhotoCounts }>(`/admin/photos/counts`);
      return data;
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}

// ===== Хуки действий =====
export function useApprovePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(`/admin/photos/${id}/approve`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "photos"] });
      // ЧАСТЬ 7: пер-юзер таб «Фото» тоже должен обновиться после мутации.
      // userId мутация не знает (работает по photo.id), поэтому инвалидируем
      // весь префикс — refetch случится только у смонтированного таба (он один).
      qc.invalidateQueries({ queryKey: ["user-photos"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка одобрения фото")),
  });
}

export function useRejectPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: PhotoRejectReason }) => {
      const { data } = await api.post<{ message: string }>(`/admin/photos/${id}/reject`, { reason });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "photos"] });
      // ЧАСТЬ 7: пер-юзер таб «Фото» тоже должен обновиться после мутации.
      // userId мутация не знает (работает по photo.id), поэтому инвалидируем
      // весь префикс — refetch случится только у смонтированного таба (он один).
      qc.invalidateQueries({ queryKey: ["user-photos"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка отклонения фото")),
  });
}

export function useSetPrimaryPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(`/admin/photos/${id}/set-primary`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "photos"] });
      // ЧАСТЬ 7: пер-юзер таб «Фото» тоже должен обновиться после мутации.
      // userId мутация не знает (работает по photo.id), поэтому инвалидируем
      // весь префикс — refetch случится только у смонтированного таба (он один).
      qc.invalidateQueries({ queryKey: ["user-photos"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка установки аватара")),
  });
}

export function useSoftDeletePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(`/admin/photos/${id}/soft-delete`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "photos"] });
      // ЧАСТЬ 7: пер-юзер таб «Фото» тоже должен обновиться после мутации.
      // userId мутация не знает (работает по photo.id), поэтому инвалидируем
      // весь префикс — refetch случится только у смонтированного таба (он один).
      qc.invalidateQueries({ queryKey: ["user-photos"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка перемещения в карантин")),
  });
}

export function useRestorePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(`/admin/photos/${id}/restore`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "photos"] });
      // ЧАСТЬ 7: пер-юзер таб «Фото» тоже должен обновиться после мутации.
      // userId мутация не знает (работает по photo.id), поэтому инвалидируем
      // весь префикс — refetch случится только у смонтированного таба (он один).
      qc.invalidateQueries({ queryKey: ["user-photos"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка восстановления фото")),
  });
}

export function useDestroyPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<{ message: string }>(`/admin/photos/${id}`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "photos"] });
      // ЧАСТЬ 7: пер-юзер таб «Фото» тоже должен обновиться после мутации.
      // userId мутация не знает (работает по photo.id), поэтому инвалидируем
      // весь префикс — refetch случится только у смонтированного таба (он один).
      qc.invalidateQueries({ queryKey: ["user-photos"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка удаления фото")),
  });
}

export function useApproveAllForUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: number) => {
      const { data } = await api.post<{ count: number; message: string }>(
        `/admin/photos/user/${userId}/approve-all`
      );
      return data;
    },
    onSuccess: (data) => {
      if (data.count > 0) {
        toast.success(data.message);
      } else {
        toast.info(data.message);
      }
      qc.invalidateQueries({ queryKey: ["admin", "photos"] });
      // ЧАСТЬ 7: пер-юзер таб «Фото» тоже должен обновиться после мутации.
      // userId мутация не знает (работает по photo.id), поэтому инвалидируем
      // весь префикс — refetch случится только у смонтированного таба (он один).
      qc.invalidateQueries({ queryKey: ["user-photos"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка массового одобрения")),
  });
}

export function useRejectAllForUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: number) => {
      const { data } = await api.post<{ count: number; message: string }>(
        `/admin/photos/user/${userId}/reject-all`
      );
      return data;
    },
    onSuccess: (data) => {
      if (data.count > 0) {
        toast.success(data.message);
      } else {
        toast.info(data.message);
      }
      qc.invalidateQueries({ queryKey: ["admin", "photos"] });
      // ЧАСТЬ 7: пер-юзер таб «Фото» тоже должен обновиться после мутации.
      // userId мутация не знает (работает по photo.id), поэтому инвалидируем
      // весь префикс — refetch случится только у смонтированного таба (он один).
      qc.invalidateQueries({ queryKey: ["user-photos"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка массового отклонения")),
  });
}

// extractErrorMessage — используем глобальный из lib/api.ts (импортирован выше).
// Раньше была локальная копия — убрали для consistency.

// Лейблы причин отказа (PHOTO_REJECT_REASONS, getRejectReasonLabel, тип
// PhotoRejectReason) перенесены в lib/photos.ts (ЧАСТЬ 7) — см. реэкспорт
// вверху файла. Обратно-совместимо: старые импорты из этого модуля работают.