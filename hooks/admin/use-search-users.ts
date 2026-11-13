// hooks/admin/use-search-users.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface SearchUserItem {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  status: string;
  deleted_at: string | null;
  has_active_premium: boolean;
  has_active_vip: boolean;
  is_verified: boolean;
  is_online: boolean;
}

export function useSearchUsers(query: string, enabled: boolean = true) {
  return useQuery<{ data: SearchUserItem[] }>({
    queryKey: ["admin", "broadcasts", "search-users", query],
    queryFn: async () => {
      const { data } = await api.get<{ data: SearchUserItem[] }>("/admin/broadcasts/search-users", {
        params: { q: query },
      });
      return data;
    },
    enabled: enabled && query.length >= 2,
    staleTime: 10_000,
  });
}