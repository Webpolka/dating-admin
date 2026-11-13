// hooks/admin/use-media-library.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { extractErrorMessage } from "@/lib/api";
import { toast } from "sonner";

export interface MediaLibraryItem {
  id: number;
  file_name: string;
  url: string;
  thumb_url: string;
  sm_url: string;
  lg_url: string;
  collection: string;
  is_processing: boolean;
  size: number;
  mime_type: string;
  created_at: string;
}

export interface MediaLibraryListResponse {
  data: MediaLibraryItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  collection: string;
  collection_label: string;
  crop_rules: {
    keep_original: boolean;
    alpha: boolean;
    max_size_mb: number;
    variants: Array<{
      key: string;
      size: string;
      fit: string;
      format: string;
      quality: number;
    }>;
  };
}

export interface MediaCollectionCounts {
  all: number;
  [key: string]: number;
}

export interface MediaVariantDetail {
  key: string;
  url: string;
  size: string;
  fit: string;
  format: string;
}

export interface MediaItemDetail {
  id: number;
  file_name: string;
  collection: string;
  collection_label: string;
  size: number;
  mime_type: string;
  created_at: string;
  variants: MediaVariantDetail[];
  is_processing: boolean;
  lg_url: string;
  thumb_url: string;
}

interface MediaLibraryParams {
  search?: string;
  collection?: string;
  page?: number;
  per_page?: number;
}

/**
 * Список медиа.
 * F4: placeholderData вместо deprecated keepPreviousData.
 * Polling 3 сек если есть is_processing файлы (пока Job нарезает варианты).
 */
export function useMediaLibraryList(params: MediaLibraryParams) {
  return useQuery<MediaLibraryListResponse>({
    queryKey: ["admin", "media-library", "list", params],
    queryFn: async () => {
      const { data } = await api.get<MediaLibraryListResponse>("/admin/media", { params });
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 0,
    refetchInterval: (query) => {
      const items = query.state.data?.data ?? [];
      const hasProcessing = items.some((m) => m.is_processing);
      return hasProcessing ? 3000 : false;
    },
  });
}

export function useMediaCollectionCounts() {
  return useQuery<{ data: MediaCollectionCounts }>({
    queryKey: ["admin", "media-library", "counts"],
    queryFn: async () => {
      const { data } = await api.get<{ data: MediaCollectionCounts }>("/admin/media/counts");
      return data;
    },
    staleTime: 60_000,
  });
}

export function useMediaItemDetail(id: number | null) {
  return useQuery<{ data: MediaItemDetail }>({
    queryKey: ["admin", "media-library", "detail", id],
    queryFn: async () => {
      const { data } = await api.get<{ data: MediaItemDetail }>(`/admin/media/${id}`);
      return data;
    },
    enabled: id !== null,
    staleTime: 0,
  });
}

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["admin", "media-library"] });
  qc.invalidateQueries({ queryKey: ["admin", "media"] });
};

export function useUploadMediaLibrary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { files: File[]; collection: string }) => {
      const formData = new FormData();
      formData.append("collection", payload.collection);
      payload.files.forEach((f) => formData.append("files[]", f));
      const { data } = await api.post<{ message: string }>("/admin/media", formData);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      invalidateAll(qc);
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка загрузки файлов")),
  });
}

export function useDeleteMediaLibrary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/media/${id}`);
    },
    onSuccess: () => {
      toast.success("Файл удален");
      invalidateAll(qc);
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка удаления")),
  });
}