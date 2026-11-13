// hooks/admin/use-media.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { extractErrorMessage } from "@/lib/api";
import { toast } from "sonner";

export interface MediaItem {
  id: number;
  file_name: string;
  disk_path: string;
  url: string;
  thumb_url: string;
  sm_url: string;
  lg_url: string;
  is_processing: boolean;
  size: number;
  mime_type: string;
  created_at: string;
}

export interface CropVariant {
  key: string;
  size: string;
  fit: string;
  format: string;
  quality: number;
}

export interface CropRules {
  keep_original: boolean;
  alpha: boolean;
  max_size_mb: number;
  variants: CropVariant[];
}

export interface MediaListResponse {
  data: MediaItem[];
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
  crop_rules: CropRules;
}

interface MediaListParams {
  collection?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

/**
 * Хук для MediaPicker (используется в форме подарков, блоге и т.д.).
 * F4: placeholderData вместо deprecated keepPreviousData.
 */
export function useMediaList(params: MediaListParams, enabled: boolean = true) {
  return useQuery<MediaListResponse>({
    queryKey: ["admin", "media", params],
    queryFn: async () => {
      const { data } = await api.get<MediaListResponse>("/admin/media", { params });
      return data;
    },
    enabled,
    staleTime: 0,
    placeholderData: (prev) => prev,
    refetchInterval: (query) => {
      const items = query.state.data?.data ?? [];
      const hasProcessing = items.some((m) => m.is_processing);
      return hasProcessing ? 3000 : false;
    },
  });
}

export function useUploadMedia() {
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
      qc.invalidateQueries({ queryKey: ["admin", "media"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка загрузки файлов")),
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/media/${id}`);
    },
    onSuccess: () => {
      toast.success("Файл удален");
      qc.invalidateQueries({ queryKey: ["admin", "media"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка удаления")),
  });
}

export function useBulkDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      const { data } = await api.post<{ message: string }>("/admin/media/bulk-delete", { ids });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "media"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка удаления")),
  });
}