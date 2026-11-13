// hooks/admin/use-support-templates.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { extractErrorMessage } from "@/lib/api";

// ===== Типы =====
export type SupportTemplateItem = {
  id: number;
  title: string;
  body: string;
  is_active: boolean;
  sort_order: number;
  category_id: number | null;
  category: { id: number; name: string; slug: string } | null;
  created_at: string | null;
  updated_at: string | null;
};

export type SupportCategoryItem = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  is_system: boolean;
  templates_count: number;
};

export type SupportTemplatesListResponse = {
  data: SupportTemplateItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  counts: {
    total: number;
    active: number;
    categories: Record<number, number>;
  };
};

export type SupportTemplatesListParams = {
  q?: string;
  category?: string;
  page?: number;
  per_page?: number;
};

export type CategoriesListResponse = {
  data: SupportCategoryItem[];
  counts: {
    total: number;
    active: number;
    categories: Record<number, number>;
  };
};

export type TemplateFormData = {
  category_id: number;
  title: string;
  body: string;
  is_active: boolean;
  sort_order: number;
};

export type CategoryFormData = {
  name: string;
  slug?: string;
  is_active: boolean;
  sort_order: number;
};

// ===== Хуки: Шаблоны =====
export function useSupportTemplatesList(params: SupportTemplatesListParams) {
  return useQuery<SupportTemplatesListResponse>({
    queryKey: ["admin", "support-templates", params],
    queryFn: async ({ queryKey }) => {
      const [, , p] = queryKey as [string, string, SupportTemplatesListParams];
      const search = new URLSearchParams();
      if (p.q) search.set("q", p.q);
      if (p.category && p.category !== "all") search.set("category", p.category);
      if (p.page) search.set("page", String(p.page));
      if (p.per_page) search.set("per_page", String(p.per_page));
      const { data } = await api.get<SupportTemplatesListResponse>(`/admin/support-templates?${search.toString()}`);
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });
}

export function useSupportTemplateDetail(id: number | null, enabled: boolean) {
  return useQuery<SupportTemplateItem>({
    queryKey: ["admin", "support-templates", "detail", id],
    queryFn: async () => {
      const { data } = await api.get<{ data: SupportTemplateItem }>(`/admin/support-templates/${id}`);
      return data.data;
    },
    enabled: enabled && !!id,
    staleTime: 0,
  });
}

export function useCreateSupportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TemplateFormData) => {
      const { data } = await api.post<{ message: string; data: SupportTemplateItem }>(`/admin/support-templates`, payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "support-templates"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка создания шаблона")),
  });
}

export function useUpdateSupportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: TemplateFormData }) => {
      const { data } = await api.put<{ message: string; data: SupportTemplateItem }>(`/admin/support-templates/${id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "support-templates"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка обновления шаблона")),
  });
}

export function useDeleteSupportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<{ message: string }>(`/admin/support-templates/${id}`);
      return data;
    },
    onSuccess: (data) => {
      toast.warning(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "support-templates"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка удаления шаблона")),
  });
}

// ===== Хуки: Категории =====
export function useSupportCategoriesList(search: string) {
  return useQuery<CategoriesListResponse>({
    queryKey: ["admin", "support-templates", "categories", search],
    queryFn: async ({ queryKey }) => {
      const [, , , s] = queryKey as [string, string, string, string];
      const searchParams = new URLSearchParams();
      if (s) searchParams.set("q", s);
      const { data } = await api.get<CategoriesListResponse>(`/admin/support-templates/categories?${searchParams.toString()}`);
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });
}

export function useCreateSupportCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CategoryFormData) => {
      const { data } = await api.post<{ message: string; data: SupportCategoryItem }>(`/admin/support-templates/categories`, payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "support-templates"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка создания категории")),
  });
}

export function useUpdateSupportCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: CategoryFormData }) => {
      const { data } = await api.put<{ message: string; data: SupportCategoryItem }>(`/admin/support-templates/categories/${id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "support-templates"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка обновления категории")),
  });
}

export function useDeleteSupportCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<{ message: string }>(`/admin/support-templates/categories/${id}`);
      return data;
    },
    onSuccess: (data) => {
      toast.warning(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "support-templates"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка удаления категории")),
  });
}