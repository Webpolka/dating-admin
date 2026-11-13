// hooks/admin/use-blog-posts.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { extractErrorMessage } from "@/lib/api";
import { toast } from "sonner";

export type BlogPostStatus = "draft" | "published" | "archived";

export type BlogPostStatusVariant = "warning" | "success" | "secondary";


export interface BlogPostValidationErrors {
  title?: string[];
  slug?: string[];
  excerpt?: string[];
  body?: string[];
  category_id?: string[];
  status?: string[];
  is_featured?: string[];
  cover_media_id?: string[];
  [key: string]: string[] | undefined;
}

interface ValidationErrorResponse {
  message?: string;
  errors?: BlogPostValidationErrors;
}

export interface BlogPostList {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  status: BlogPostStatus;
  status_label: string;
  status_variant: BlogPostStatusVariant;
  is_featured: boolean;
  views_count: number;
  category_id: number | null;
  cover_media_id: number | null;
  category: { id: number; name: string; slug: string } | null;
  cover_url: string;
  cover_thumb: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogPostDetail extends BlogPostList {
  body: string;
  cover_sm_url: string | null;
  author: { id: number; name: string } | null;
}

export interface BlogPostCounts {
  all: number;
  published: number;
  draft: number;
  archived: number;
  uncategorized: number;
}


// ============================================
// СПИСОК ПОСТОВ
// ============================================
interface BlogPostListResponse {
  data: BlogPostList[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  counts: BlogPostCounts;
}

export type BlogStatusFilter = "all" | "published" | "draft" | "archived" | "uncategorized";

interface BlogPostListParams {
  q?: string;
  status?: BlogStatusFilter;
  page?: number;
  per_page?: number;
}


// ============================================
// ОТДЕЛЬНЫЙ ХУК ДЛЯ СЧЕТЧИКОВ
// ============================================
export function useBlogPostCounts() {
  return useQuery<{ data: BlogPostCounts }>({
    queryKey: ["admin", "blog", "posts", "counts"],
    queryFn: async () => {
      const { data } = await api.get<{ data: BlogPostCounts }>("/admin/blog/posts/counts");
      return data;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * F3: placeholderData вместо deprecated keepPreviousData.
 */
export function useBlogPostsList(params: BlogPostListParams) {
  return useQuery<BlogPostListResponse>({
    queryKey: ["admin", "blog", "posts", "list", params],
    queryFn: async () => {
      const { data } = await api.get<BlogPostListResponse>("/admin/blog/posts", { params });
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 0,
  });
}

export function useBlogPost(id: number | null) {
  return useQuery<{ data: BlogPostDetail }>({
    queryKey: ["admin", "blog", "posts", "detail", id],
    queryFn: async () => {
      const { data } = await api.get<{ data: BlogPostDetail }>(`/admin/blog/posts/${id}`);
      return data;
    },
    enabled: id !== null,
    staleTime: 0,
  });
}

export interface BlogPostPayload {
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  category_id: number | null;
  status: BlogPostStatus;
  is_featured: boolean;
  cover_media_id: number | null;
}

// ============================================
// ВСЕ МУТАЦИИ — инвалидируют И список И счётчики
// ============================================

const invalidateBlogPosts = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["admin", "blog", "posts", "list"] });
  qc.invalidateQueries({ queryKey: ["admin", "blog", "posts", "counts"] });
};

export function useSetFeaturedBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<{ message: string; is_featured: boolean }> => {
      const { data } = await api.post<{ message: string; is_featured: boolean }>(
        `/admin/blog/posts/${id}/feature`
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      invalidateBlogPosts(qc);
    },
    // F8: extractErrorMessage из lib/api
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка смены закрепления")),
  });
}

export function useCreateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BlogPostPayload): Promise<BlogPostDetail> => {
      const { data } = await api.post<{ data: BlogPostDetail; message: string }>(
        "/admin/blog/posts",
        payload
      );
      return data.data;
    },
    onSuccess: () => {
      toast.success("Пост создан");
      invalidateBlogPosts(qc);
    },
    onError: (error: unknown) => {
      // F8: используем extractErrorMessage из lib/api для generic ошибки.
      // Но валидационные ошибки (422) обрабатываются в форме через onError callback.
      const errResponse = error as { response?: { status?: number; data?: ValidationErrorResponse } };
      if (errResponse?.response?.status === 422) {
        // 422 — валидация. Не показываем toast, форма сама покажет ошибки по полям.
        return;
      }
      toast.error(extractErrorMessage(error, "Ошибка создания поста"));
    },
  });
}

export function useUpdateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: BlogPostPayload }): Promise<BlogPostDetail> => {
      const { data } = await api.put<{ data: BlogPostDetail; message: string }>(
        `/admin/blog/posts/${id}`,
        payload
      );
      return data.data;
    },
    onSuccess: (_data, vars) => {
      toast.success("Пост обновлен");
      invalidateBlogPosts(qc);
      qc.invalidateQueries({ queryKey: ["admin", "blog", "posts", "detail", vars.id] });
    },
    onError: (error: unknown) => {
      const errResponse = error as { response?: { status?: number; data?: ValidationErrorResponse } };
      if (errResponse?.response?.status === 422) return;
      toast.error(extractErrorMessage(error, "Ошибка обновления поста"));
    },
  });
}

export function useDuplicateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<BlogPostDetail> => {
      const { data } = await api.post<{ data: BlogPostDetail; message: string }>(
        `/admin/blog/posts/${id}/duplicate`
      );
      return data.data;
    },
    onSuccess: (newPost) => {
      toast.success("Пост продублирован");
      invalidateBlogPosts(qc);
      return newPost.id;
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка дублирования")),
  });
}


export function useToggleBlogPostStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string; status: BlogPostStatus }>(
        `/admin/blog/posts/${id}/toggle`
      );
      return data;
    },
    onSuccess: () => {
      toast.success("Статус обновлен");
      invalidateBlogPosts(qc);
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка смены статуса")),
  });
}


export function useArchiveBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(`/admin/blog/posts/${id}/archive`);
      return data;
    },
    onSuccess: () => {
      toast.success("Пост перемещен в архив");
      invalidateBlogPosts(qc);
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка архивации")),
  });
}

export function useRestoreBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(`/admin/blog/posts/${id}/restore`);
      return data;
    },
    onSuccess: () => {
      toast.success("Пост восстановлен");
      invalidateBlogPosts(qc);
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка восстановления")),
  });
}


export function useDeleteBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<{ message: string }>(`/admin/blog/posts/${id}`);
      return data;
    },
    onSuccess: () => {
      toast.success("Пост удален");
      invalidateBlogPosts(qc);
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка удаления")),
  });
}

export type BulkBlogAction = "publish" | "draft" | "archive" | "delete";

export function useBulkBlogPosts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { ids: number[]; action: BulkBlogAction; is_archive_tab: boolean }) => {
      const { data } = await api.post<{ message: string; counts: BlogPostCounts }>(
        "/admin/blog/posts/bulk",
        payload
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      invalidateBlogPosts(qc);
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка массового действия")),
  });
}