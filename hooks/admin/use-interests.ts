// hooks/admin/use-interests.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { extractErrorMessage } from "@/lib/api";
import { toast } from "sonner";

// ============================================
// Типы
// ============================================

export interface InterestValidationErrors {
  name?: string[];
  category_id?: string[];
  search_boost?: string[];
  [key: string]: string[] | undefined;
}

interface ValidationErrorResponse {
  message?: string;
  errors?: InterestValidationErrors;
}

export interface InterestCategoryRef {
  id: number;
  name: string;
  slug: string;
}

export interface InterestList {
  id: number;
  name: string;
  slug: string;
  category_id: number | null;
  category: InterestCategoryRef | null;
  search_boost: number;
  users_count: number;
  created_at: string;
  updated_at: string;
}

export interface InterestDetail extends InterestList {}

export interface InterestCounts {
  all: number;
  uncategorized: number;
  boosted: number;
}

/**
 * Фильтр по категории:
 *  - 'all'           — все интересы
 *  - 'uncategorized' — без категории (category_id IS NULL)
 *  - 'boosted'       — в бусте (search_boost > 0)
 *  - number          — конкретная категория (category_id = N)
 */
export type InterestCategoryFilter = "all" | "uncategorized" | "boosted" | number;

export interface InterestPayload {
  name: string;
  category_id: number | null;
  search_boost: number;
}

export type BulkInterestAction = "delete" | "set_category";

// ============================================
// Список
// ============================================

interface InterestListResponse {
  data: InterestList[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  counts: InterestCounts;
}

interface InterestListParams {
  q?: string;
  category_id?: InterestCategoryFilter;
  page?: number;
  per_page?: number;
}

export function useInterestsCounts() {
  return useQuery<{ data: InterestCounts }>({
    queryKey: ["admin", "interests", "counts"],
    queryFn: async () => {
      const { data } = await api.get<{ data: InterestCounts }>("/admin/interests/counts");
      return data;
    },
    // staleTime: 0 — счётчики должны рефетчиться сразу при инвалидации
    // (иначе при staleTime: 60_000 invalidateQueries помечает stale, но
    //  рефетч срабатывает только при следующем монтировании/фокусе окна).
    staleTime: 0,
    gcTime: 5 * 60_000,
  });
}

export function useInterestsList(params: InterestListParams) {
  return useQuery<InterestListResponse>({
    queryKey: ["admin", "interests", "list", params],
    queryFn: async () => {
      const { data } = await api.get<InterestListResponse>("/admin/interests", { params });
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 0,
  });
}

export function useInterest(id: number | null) {
  return useQuery<{ data: InterestDetail }>({
    queryKey: ["admin", "interests", "detail", id],
    queryFn: async () => {
      const { data } = await api.get<{ data: InterestDetail }>(`/admin/interests/${id}`);
      return data;
    },
    enabled: id !== null,
    staleTime: 0,
  });
}

// ============================================
// Мутации
// ============================================

const invalidateInterests = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["admin", "interests", "list"] });
  qc.invalidateQueries({ queryKey: ["admin", "interests", "counts"] });
  // Счётчики на табах конкретных категорий («Хобби» = 13) берутся из
  // useInterestCategories.interests_count — этот запрос тоже надо сбрасывать,
  // иначе табы категорий залипают после delete / set_category / create.
  qc.invalidateQueries({ queryKey: ["admin", "interests", "categories"] });
};

export function useCreateInterest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: InterestPayload): Promise<InterestDetail> => {
      const { data } = await api.post<{ data: InterestDetail; message: string }>(
        "/admin/interests",
        payload
      );
      return data.data;
    },
    onSuccess: () => {
      toast.success("Интерес создан");
      invalidateInterests(qc);
    },
    onError: (error: unknown) => {
      const errResponse = error as { response?: { status?: number; data?: ValidationErrorResponse } };
      if (errResponse?.response?.status === 422) return; // валидация — форма покажет
      toast.error(extractErrorMessage(error, "Ошибка создания интереса"));
    },
  });
}

export function useUpdateInterest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: InterestPayload }): Promise<InterestDetail> => {
      const { data } = await api.put<{ data: InterestDetail; message: string }>(
        `/admin/interests/${id}`,
        payload
      );
      return data.data;
    },
    onSuccess: (_data, vars) => {
      toast.success("Интерес обновлен");
      invalidateInterests(qc);
      qc.invalidateQueries({ queryKey: ["admin", "interests", "detail", vars.id] });
    },
    onError: (error: unknown) => {
      const errResponse = error as { response?: { status?: number; data?: ValidationErrorResponse } };
      if (errResponse?.response?.status === 422) return;
      toast.error(extractErrorMessage(error, "Ошибка обновления интереса"));
    },
  });
}

export function useBoostInterest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, searchBoost }: { id: number; searchBoost: number }): Promise<{ message: string; search_boost: number }> => {
      const { data } = await api.post<{ message: string; search_boost: number }>(
        `/admin/interests/${id}/boost`,
        { search_boost: searchBoost }
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      invalidateInterests(qc);
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка изменения буста")),
  });
}

export function useDeleteInterest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<{ message: string }>(`/admin/interests/${id}`);
      return data;
    },
    onSuccess: () => {
      toast.success("Интерес удален");
      invalidateInterests(qc);
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка удаления")),
  });
}

export function useBulkInterests() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      ids: number[];
      action: BulkInterestAction;
      category_id?: number | null;
    }) => {
      const { data } = await api.post<{ message: string; count: number; counts: InterestCounts }>(
        "/admin/interests/bulk",
        payload
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      // Бэк уже вернул свежие counts — кладём их в кэш сразу (мгновенное
      // обновление табов «Все»/«Без категории»/«В бусте» без лишнего запроса).
      if (data.counts) {
        qc.setQueryData<{ data: InterestCounts }>(
          ["admin", "interests", "counts"],
          { data: data.counts }
        );
      }
      invalidateInterests(qc);
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка массового действия")),
  });
}
