// hooks/admin/use-blog-categories.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  posts_count: number;
}

export function useBlogCategories() {
  return useQuery<{ data: BlogCategory[] }>({
    queryKey: ["admin", "blog", "categories"],
    queryFn: async () => {
      const { data } = await api.get<{ data: BlogCategory[] }>("/admin/blog/categories");
      return data;
    },
    staleTime: 0,
  });
}


export function useCreateBlogCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<BlogCategory> => {
      const { data } = await api.post<{ data: BlogCategory; message: string }>(
        "/admin/blog/categories",
        { name }
      );
      return data.data; // ← возвращаем чистую категорию
    },
    onSuccess: (category) => {
      toast.success(`Рубрика "${category.name}" создана`);
      qc.invalidateQueries({ queryKey: ["admin", "blog", "categories"] });
    },
    onError: () => toast.error("Ошибка создания рубрики"),
  });
}

export function useDeleteBlogCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<{ message: string }>(`/admin/blog/categories/${id}`);
      return data;
    },
    onSuccess: () => {
      toast.success("Рубрика удалена");
      qc.invalidateQueries({ queryKey: ["admin", "blog", "categories"] });
    },
    onError: () => toast.error("Ошибка удаления рубрики"),
  });
}