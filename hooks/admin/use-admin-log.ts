// hooks/admin/use-admin-log.ts
"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import type { UserBadgeData } from "@/lib/types";

export interface AdminLogItem {
  id: number;
  created_at: string;
  action: string;
  ip_address: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  object_type: string;
  object_id: number | null;
  is_deleted: boolean;
  is_system: boolean;
  object_url: string | null;
  admin: UserBadgeData | null;
}
export interface AdminLogStats {
  [key: string]: number;
}

export interface AdminLogAdmin {
  id: number;
  name: string;
}

interface AdminLogResponse {
  data: AdminLogItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  stats: AdminLogStats;
  admins: AdminLogAdmin[];
  total_entries: number;
}

interface AdminLogParams {
  q?: string;
  cat?: string;
  adm?: string;
  date?: string;
  page?: number;
  per_page?: number;
}

export function useAdminLogList(params: AdminLogParams) {
  return useQuery<AdminLogResponse>({
    queryKey: ["admin", "admin-log", "list", params],
    queryFn: async () => {
      const { data } = await api.get<AdminLogResponse>("/admin/audit/logs", { params });
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

export function useRefreshAdminLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ stats: AdminLogStats; admins: AdminLogAdmin[]; total_entries: number }>(
        "/admin/audit/logs/refresh"
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success("Данные журнала синхронизированы!");
      qc.setQueriesData({ queryKey: ["admin", "admin-log", "list"] }, (old: AdminLogResponse | undefined) => {
        if (!old) return old;
        return { ...old, stats: data.stats, admins: data.admins, total_entries: data.total_entries };
      });
    },
    onError: () => toast.error("Ошибка обновления"),
  });
}