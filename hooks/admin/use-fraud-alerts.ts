// hooks/admin/use-fraud-alerts.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { extractErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import type { UserBadgeData } from "@/lib/types";

export type FraudSeverity = "low" | "medium" | "high";
export type FraudStatus = "open" | "resolved" | "false_positive";

export interface FraudAlertItem {
  id: number;
  trigger_type: string;
  trigger_label: string;
  trigger_color: string;
  severity: FraudSeverity;
  severity_label: string;
  severity_variant: string;
  status: FraudStatus;
  status_label: string;
  status_variant: string;
  meta: Record<string, unknown> | null;
  created_at: string;
  is_open: boolean;
  user: UserBadgeData | null;
  admin: { id: number; name: string } | null;
}

export interface FraudCounts {
  total: number;
  open: number;
  resolved: number;
  false_positive: number;
  high_priority: number;
}

interface FraudAlertListResponse {
  data: FraudAlertItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  // Counts убраны из list response — см. useFraudCounts (stable queryKey).
  status: FraudStatus | "all";
}

interface FraudAlertParams {
  q?: string;
  status?: string;
  severity?: string;
  page?: number;
  per_page?: number;
}

export function useFraudAlertsList(params: FraudAlertParams) {
  return useQuery<FraudAlertListResponse>({
    queryKey: ["admin", "fraud", "list", params],
    queryFn: async () => {
      const { data } = await api.get<FraudAlertListResponse>("/admin/fraud-alerts", { params });
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });
}

/**
 * Stable query для counts — не зависит от filter/search/page/severity.
 * QueryKey ["admin","fraud","counts"] не меняется → counts не скачут
 * при смене статуса/опасности/страницы. Раньше counts были в list-response →
 * каждая page-loading перезаписывала их.
 *
 * refetchInterval 30s — автообновление счётчиков, чтобы админ видел
 * новые «опасные» алерты без перезагрузки страницы.
 */
export function useFraudCounts() {
  return useQuery<{ stats: FraudCounts }>({
    queryKey: ["admin", "fraud", "counts"],
    queryFn: async () => {
      const { data } = await api.get<{ stats: FraudCounts }>(
        `/admin/fraud-alerts/counts`
      );
      return data;
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}

// ===== Хуки действий =====
//
// onSuccess: toast.success — показывает message от бэкенда (включая
// idempotency-ответы "Алерт уже закрыт" — это успех, не ошибка).
// onError: extractErrorMessage — достаёт человекочитаемое сообщение
// из response.data.message (для 422/429/500) или сетевую ошибку.

export function useResolveAndBan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, type }: { id: number; type: string }): Promise<{ message: string }> => {
      const { data } = await api.post(`/admin/fraud-alerts/${id}/resolve-and-ban`, { type });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      // Инвалидируем: список (статус алерта сменился) + counts
      // (может появиться новый open алерт или закрыться существующий).
      qc.invalidateQueries({ queryKey: ["admin", "fraud"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка применения бана")),
  });
}

export function useResolveWithWarning() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<{ message: string }> => {
      const { data } = await api.post(`/admin/fraud-alerts/${id}/resolve-with-warning`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "fraud"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка отправки предупреждения")),
  });
}

export function useMarkAsFalsePositive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<{ message: string }> => {
      const { data } = await api.post(`/admin/fraud-alerts/${id}/false-positive`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "fraud"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка отметки ложного срабатывания")),
  });
}
