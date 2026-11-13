// hooks/admin/use-stop-words.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { extractErrorMessage } from "@/lib/api";

// ===== Типы =====
export type StopWordAction = "mask" | "reject" | "alert";
export type StopWordCategory = "mat" | "scam" | "prostitution" | "drugs" | "contacts";

export type StopWordItem = {
  id: number;
  word: string;
  category: StopWordCategory;
  category_label: string;
  action: StopWordAction;
  action_label: string;
  action_variant: "default" | "secondary" | "destructive" | "warning";
  replacement: string;
  is_active: boolean;
  created_at: string | null;
};

export type StopWordsListResponse = {
  data: StopWordItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  counts: { total: number; active: number };
};

export type StopWordsListParams = {
  q?: string;
  category?: string;
  action?: string;
  status?: string;
  page?: number;
  per_page?: number;
};

export type CreateBulkPayload = {
  words: string;
  category: StopWordCategory;
  action: StopWordAction;
};

export type UpdateStopWordPayload = {
  word: string;
  category: StopWordCategory;
  action: StopWordAction;
  replacement?: string;
  is_active?: boolean;
};

export type BulkActionPayload = {
  ids: number[];
  action: "activate" | "deactivate" | "delete";
};

// ===== Хуки =====
export function useStopWordsList(params: StopWordsListParams) {
  return useQuery<StopWordsListResponse>({
    queryKey: ["admin", "stop-words", params],
    queryFn: async ({ queryKey }) => {
      const [, , p] = queryKey as [string, string, StopWordsListParams];
      const search = new URLSearchParams();
      if (p.q) search.set("q", p.q);
      if (p.category && p.category !== "all") search.set("category", p.category);
      if (p.action && p.action !== "all") search.set("action", p.action);
      if (p.status && p.status !== "all") search.set("status", p.status);
      if (p.page) search.set("page", String(p.page));
      if (p.per_page) search.set("per_page", String(p.per_page));
      const { data } = await api.get<StopWordsListResponse>(
        `/admin/stop-words?${search.toString()}`
      );
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });
}

/**
 * Отдельный query ТОЛЬКО для counts (total/active).
 *
 * Stable queryKey (без filter/page/q params) — не пересоздаётся при
 * смене фильтров → counts не скачут. Дёргает существующий endpoint
 * /admin/stop-words/counts (на бэке уже есть).
 */
export function useStopWordsCounts() {
  return useQuery<{ total: number; active: number }>({
    queryKey: ["admin", "stop-words", "counts"],
    queryFn: async () => {
      const { data } = await api.get<{ data: { total: number; active: number } }>(
        `/admin/stop-words/counts`
      );
      return data.data;
    },
    staleTime: 15_000,
  });
}

export function useCreateBulkStopWords() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBulkPayload) => {
      const { data } = await api.post<{
        message: string;
        created_count: number;
        duplicate_count: number;
        total_count: number;
      }>(`/admin/stop-words`, payload);
      return data;
    },
    onSuccess: (data) => {
      const { created_count, duplicate_count, total_count } = data;

      // Все введённые слова — дубликаты → warning (жёлтый)
      if (created_count === 0) {
        toast.warning(`Все ${total_count} слов уже существуют в базе`);
        qc.invalidateQueries({ queryKey: ["admin", "stop-words"] });
        return;
      }

      // Хоть что-то добавилось → успех (зелёный), но показываем ДВЕ строки:
      //   ✅ Добавлено новых слов: N
      //   ⚠️ Пропущено дубликатов: M (жёлтым, только если M > 0)
      toast.success(`Добавлено новых слов: ${created_count}`, {
        description: duplicate_count > 0
          ? `⚠️ Пропущено дубликатов: ${duplicate_count}`
          : undefined,
      });

      qc.invalidateQueries({ queryKey: ["admin", "stop-words"] });
    },
    onError: (err: unknown) => {
      const message = extractErrorMessage(err, "Ошибка создания стоп-слов");
      toast.error(message);
    },
  });
}

export function useUpdateStopWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateStopWordPayload }) => {
      const { data } = await api.put<{ message: string; data: StopWordItem }>(
        `/admin/stop-words/${id}`,
        payload
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "stop-words"] });
    },
    onError: (err: unknown) => {
      const message = extractErrorMessage(err, "Ошибка обновления слова");
      toast.error(message);
    },
  });
}

export function useToggleStopWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string; is_active: boolean }>(
        `/admin/stop-words/${id}/toggle`
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "stop-words"] });
    },
    onError: (err: unknown) => {
      const message = extractErrorMessage(err, "Ошибка смены статуса");
      toast.error(message);
    },
  });
}

export function useDeleteStopWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<{ message: string }>(`/admin/stop-words/${id}`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "stop-words"] });
    },
    onError: (err: unknown) => {
      const message = extractErrorMessage(err, "Ошибка удаления");
      toast.error(message);
    },
  });
}

export function useBulkActionStopWords() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BulkActionPayload) => {
      const { data } = await api.post<{ message: string }>(
        "/admin/stop-words/bulk",
        payload
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "stop-words"] });
    },
    onError: (err: unknown) => {
      const message = extractErrorMessage(err, "Ошибка массового действия");
      toast.error(message);
    },
  });
}
