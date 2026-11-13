// hooks/admin/use-reports.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { extractErrorMessage } from "@/lib/api";

// ===== Типы =====
export type ReportStatus = "pending" | "resolved" | "rejected";
export type ReportableType = "User" | "Photo" | null;
export type ReportReasonType = "spam" | "porn" | "scam" | "insult" | "minor" | "fake" | string;
export type ReportResolutionType = 
  | "ban" 
  | "temp_ban" 
  | "shadowban" 
  | "warn" 
  | "photo_deleted" 
  | "no_action" 
  | null;

export type ReportUser = {
  id: number;
  name: string;
  email: string;
  role: string; // ✅ ДОБАВИЛИ РОЛЬ!
  avatar_url: string | null;
  is_online: boolean;
  status: string;
  deleted_at: string | null;
  has_active_premium: boolean;
  has_active_vip: boolean;
  is_verified: boolean;
};

export type ReportPhoto = {
  id: number;
  thumb_url: string;
  medium_url: string;
  original_url: string;
  user: ReportUser | null;
};

export type ReportItem = {
  id: number;
  reason: ReportReasonType;
  description: string | null;
  status: ReportStatus;
  resolution: ReportResolutionType;
  resolution_note: string | null;
  reportable_type: ReportableType;
  reportable_id: number | null;
created_at: string | null;
  updated_at: string | null;
  reporter: ReportUser | null;
  reported: ReportUser | null;
  photo: ReportPhoto | null; // Только если жалоба на фото
};

export type ReportCounts = {
  pending: number;
  resolved: number;
  rejected: number;
  total: number;
};

type ReportsListResponse = {
  data: ReportItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  stats: ReportCounts;
  status: ReportStatus | "all";
};

type ReportsListParams = {
  status: ReportStatus | "all";
  type?: string; // all, user, photo
  q?: string;
  page?: number;
  per_page?: number;
};

// ===== Хуки чтения =====
export function useReportsList(params: ReportsListParams) {
  return useQuery<ReportsListResponse>({
    queryKey: ["admin", "reports", params],
    queryFn: async ({ queryKey }) => {
      const [, , p] = queryKey as [string, string, ReportsListParams];
      const search = new URLSearchParams();
      search.set("status", p.status);
      if (p.type && p.type !== "all") search.set("type", p.type);
      if (p.q) search.set("q", p.q);
      if (p.page) search.set("page", String(p.page));
      if (p.per_page) search.set("per_page", String(p.per_page));
      const { data } = await api.get<ReportsListResponse>(
        `/admin/reports?${search.toString()}`
      );
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });
}

/**
 * Stable query для counts — не зависит от filter/search/page.
 * QueryKey ["admin","reports","counts"] не меняется → counts не скачут.
 */
export function useReportCounts() {
  return useQuery<{ stats: ReportCounts }>({
    queryKey: ["admin", "reports", "counts"],
    queryFn: async () => {
      const { data } = await api.get<{ stats: ReportCounts }>(
        `/admin/reports/counts`
      );
      return data;
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}

// ===== Хуки действий =====
export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, resolution }: { id: number; resolution: string }) => {
      const { data } = await api.post<{ message: string }>(
        `/admin/reports/${id}/resolve`,
        { resolution }
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка решения жалобы")),
  });
}

export function useRejectReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(
        `/admin/reports/${id}/reject`
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка отклонения жалобы")),
  });
}

export function useReopenReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<{ message: string }>(
        `/admin/reports/${id}/reopen`
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка возврата жалобы")),
  });
}

export function useToggleBanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      type,
      reportId,
    }: {
      userId: number;
      type: "permanent" | "temp" | "shadow";
      reportId?: number;
    }) => {
      const { data } = await api.post<{ message: string }>(
        `/admin/reports/user/${userId}/ban`,
        { type, reportId }
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка изменения статуса бана")),
  });
}

export function useRejectReportPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (photoId: number) => {
      const { data } = await api.post<{ message: string }>(
        `/admin/reports/photo/${photoId}/reject`
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
    onError: (err: unknown) =>
      toast.error(extractErrorMessage(err, "Ошибка отклонения фото")),
  });
}

// extractErrorMessage — используем глобальный из lib/api.ts.

// ===== UI маппинги =====
export const REPORT_REASONS: Record<string, { label: string; color: string }> = {
  spam: { label: "Спам / Реклама", color: "bg-secondary text-secondary-foreground" },
  porn: { label: "Порнография / 18+", color: "bg-red-500/10 text-red-500" },
  scam: { label: "Мошенничество", color: "bg-orange-500/10 text-orange-500" },
  insult: { label: "Оскорбление", color: "bg-yellow-500/10 text-yellow-500" },
  minor: { label: "Несовершеннолетний", color: "bg-destructive/10 text-destructive" },
  fake: { label: "Фейк / Чужие фото", color: "bg-purple-500/10 text-purple-500" },
};

export const REPORT_RESOLUTIONS: Record<string, { label: string; color: string }> = {
  ban: { label: "Вечный бан", color: "bg-red-500/10 text-red-500" },
  temp_ban: { label: "Временный бан", color: "bg-orange-500/10 text-orange-500" },
  shadowban: { label: "Теневой бан", color: "bg-purple-500/10 text-purple-500" },
  warn: { label: "Предупреждение", color: "bg-yellow-500/10 text-yellow-500" },
  photo_deleted: { label: "Фото удалено", color: "bg-red-500/10 text-red-500" },
  no_action: { label: "Нет нарушения", color: "bg-secondary text-secondary-foreground" },
};