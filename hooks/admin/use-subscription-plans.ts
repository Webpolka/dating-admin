// hooks/admin/use-subscription-plans.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { extractErrorMessage } from "@/lib/api";

// ===== Типы =====
export type PlanTier = "premium" | "vip";

export type SubscriptionPlanItem = {
  id: number;
  tier: PlanTier;
  name: string;
  slug: string;
  price: number;
  old_price: number | null;
  currency: string;
  duration_days: number;
  apple_product_id: string | null;
  google_product_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

export type PlanFormData = {
  name: string;
  slug: string;
  price: number;
  old_price: number | null;
  duration_days: number;
  sort_order: number;
  apple_product_id: string | null;
  google_product_id: string | null;
  is_active: boolean;
};

type PlansListResponse = {
  data: SubscriptionPlanItem[];
  counts: { premium: number; vip: number };
};

type PlansListParams = {
  tier: PlanTier;
  q?: string;
};

// ===== Хуки =====

/**
 * Список тарифов по табу (premium/vip) + поиск по name/slug/id.
 *
 * staleTime: 15 сек — тарифы меняются редко, но чтобы админ видел
 * актуальные данные при переключении табов, держим короткий TTL.
 * placeholderData: prev => prev — бесшовная смена таба.
 */
export function useSubscriptionPlansList(params: PlansListParams) {
  return useQuery<PlansListResponse>({
    queryKey: ["admin", "subscription-plans", params],
    queryFn: async ({ queryKey }) => {
      const [, , p] = queryKey as [string, string, PlansListParams];
      const search = new URLSearchParams();
      search.set("tier", p.tier);
      if (p.q) search.set("q", p.q);
      const { data } = await api.get<PlansListResponse>(`/admin/subscription-plans?${search.toString()}`);
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PlanFormData & { tier: PlanTier }) => {
      const { data } = await api.post<{ message: string; data: SubscriptionPlanItem }>(`/admin/subscription-plans`, payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "subscription-plans"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка создания тарифа")),
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: PlanFormData }) => {
      const { data } = await api.put<{ message: string; data: SubscriptionPlanItem }>(`/admin/subscription-plans/${id}`, payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "subscription-plans"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка обновления тарифа")),
  });
}

export function useTogglePlanActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string; is_active: boolean }>(`/admin/subscription-plans/${id}/toggle`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "subscription-plans"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка смены статуса")),
  });
}

// extractErrorMessage и extractValidationErrors теперь в lib/api.ts —
// импортируй их оттуда напрямую в компонентах. Здесь оставили только
// переэкспорт extractValidationErrors для обратной совместимости с
// теми, кто импортил его из этого хука.
export { extractValidationErrors } from "@/lib/api";