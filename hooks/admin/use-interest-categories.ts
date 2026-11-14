// hooks/admin/use-interest-categories.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export interface InterestCategory {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  interests_count: number;
  created_at: string;
  updated_at: string;
}

export interface InterestCategoryPayload {
  name: string;
  icon?: string | null;
  sort_order?: number;
}

const CATEGORIES_KEY = ["admin", "interests", "categories"] as const;

const invalidateCategories = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: CATEGORIES_KEY });
};

export function useInterestCategories() {
  return useQuery<{ data: InterestCategory[] }>({
    queryKey: CATEGORIES_KEY,
    queryFn: async () => {
      const { data } = await api.get<{ data: InterestCategory[] }>(
        "/admin/interests/categories"
      );
      return data;
    },
    staleTime: 0,
  });
}

export function useCreateInterestCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: InterestCategoryPayload): Promise<InterestCategory> => {
      const { data } = await api.post<{ data: InterestCategory; message: string }>(
        "/admin/interests/categories",
        payload
      );
      return data.data;
    },
    onSuccess: (category) => {
      toast.success(`Категория "${category.name}" создана`);
      invalidateCategories(qc);
    },
    onError: () => toast.error("Ошибка создания категории"),
  });
}

export function useUpdateInterestCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<InterestCategoryPayload> }): Promise<InterestCategory> => {
      const { data } = await api.put<{ data: InterestCategory; message: string }>(
        `/admin/interests/categories/${id}`,
        payload
      );
      return data.data;
    },
    onSuccess: () => {
      toast.success("Категория обновлена");
      invalidateCategories(qc);
    },
    onError: () => toast.error("Ошибка обновления категории"),
  });
}

export function useDeleteInterestCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<{ message: string }>(`/admin/interests/categories/${id}`);
      return data;
    },
    onSuccess: () => {
      toast.success("Категория удалена");
      invalidateCategories(qc);
      // Интересы в удалённой категории стали uncategorized — перечитать и их.
      qc.invalidateQueries({ queryKey: ["admin", "interests"] });
    },
    onError: () => toast.error("Ошибка удаления категории"),
  });
}
