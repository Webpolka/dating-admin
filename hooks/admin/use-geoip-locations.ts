// hooks/admin/use-geoip-locations.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { extractErrorMessage } from "@/lib/api";
import { toast } from "sonner";

export type GeoType = "country" | "region" | "city";

export interface GeoLocationItem {
  id: number;
  type: GeoType;
  name: string;
  original_name: string;
  iso_code: string | null;
  latitude: number | null;
  longitude: number | null;
  parent_name: string | null;
  is_registration_blocked: boolean;
  is_feed_blocked: boolean;
}

export interface GeoLocationCounts {
  country: { total: number; blocked_reg: number; blocked_feed: number };
  region: { total: number; blocked_reg: number; blocked_feed: number };
  city: { total: number; blocked_reg: number; blocked_feed: number };
}

interface GeoLocationListResponse {
  data: GeoLocationItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  counts: GeoLocationCounts;
  type: GeoType;
}

interface GeoLocationParams {
  type?: GeoType;
  q?: string;
  page?: number;
  per_page?: number;
  blocked?: 'none' | 'reg' | 'feed';
}

/**
 * Список GeoIP локаций.
 *
 * F3: placeholderData вместо deprecated keepPreviousData.
 */
export function useGeoLocationsList(params: GeoLocationParams) {
  return useQuery<GeoLocationListResponse>({
    queryKey: ["admin", "geoip", "list", params],
    queryFn: async () => {
      const { data } = await api.get<GeoLocationListResponse>("/admin/geoip/locations", { params });
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 0,
  });
}

export function useGeoLocationsCounts() {
  return useQuery<{ data: GeoLocationCounts }>({
    queryKey: ["admin", "geoip", "counts"],
    queryFn: async () => {
      const { data } = await api.get<{ data: GeoLocationCounts }>("/admin/geoip/locations/counts");
      return data;
    },
    staleTime: 60_000,
  });
}

/**
 * Toggle registration block.
 *
 * onMutate: optimistically обновляем кэш — switch сразу переключается,
 * не дожидаясь ответа сервера. onError — откатываем.
 */
export function useToggleGeoRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post(`/admin/geoip/locations/${id}/toggle-registration`);
      return data;
    },
    onMutate: async (id: number) => {
      // Optimistic update — switch сразу переключается.
      await qc.cancelQueries({ queryKey: ["admin", "geoip", "list"] });
      const prevQueries = qc.getQueriesData<GeoLocationListResponse>({ queryKey: ["admin", "geoip", "list"] });
      qc.setQueriesData<GeoLocationListResponse>({ queryKey: ["admin", "geoip", "list"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((item) =>
            item.id === id
              ? { ...item, is_registration_blocked: !item.is_registration_blocked }
              : item
          ),
        };
      });
      return { prevQueries };
    },
    onError: (err, _id, ctx) => {
      // Откатываем optimistic update.
      ctx?.prevQueries?.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(extractErrorMessage(err, "Ошибка обновления"));
    },
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin", "geoip"] });
    },
  });
}

/**
 * Toggle feed block. Аналогично useToggleGeoRegistration.
 */
export function useToggleGeoFeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post(`/admin/geoip/locations/${id}/toggle-feed`);
      return data;
    },
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ["admin", "geoip", "list"] });
      const prevQueries = qc.getQueriesData<GeoLocationListResponse>({ queryKey: ["admin", "geoip", "list"] });
      qc.setQueriesData<GeoLocationListResponse>({ queryKey: ["admin", "geoip", "list"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((item) =>
            item.id === id
              ? { ...item, is_feed_blocked: !item.is_feed_blocked }
              : item
          ),
        };
      });
      return { prevQueries };
    },
    onError: (err, _id, ctx) => {
      ctx?.prevQueries?.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(extractErrorMessage(err, "Ошибка обновления"));
    },
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin", "geoip"] });
    },
  });
}