// lib/api/staff.ts
import api from "@/lib/api";
import type { UserBadgeData } from "@/lib/types";

/**
 * F12: StaffMember и StaffCandidate теперь наследуют UserBadgeData из lib/types.
 * Раньше эти типы дублировали те же поля (id, name, email, avatar_url, is_online,
 * status, deleted_at, has_active_premium, has_active_vip, is_verified) —
 * это приводило к `as unknown as UserBadgeData` кастам при передаче в <UserBadge>.
 * Теперь каст не нужен.
 */
export interface StaffMember extends UserBadgeData {
  role: string;
  is_founder: boolean;
  is_self: boolean;
}

export type StaffCandidate = UserBadgeData;

export interface StaffListResponse {
  data: StaffMember[];
  total: number;
  last_page: number;
  current_page: number;
}

export const staffApi = {
  getStaff: async (page: number = 1): Promise<StaffListResponse> => {
    const { data } = await api.get('/admin/staff', { params: { page } });
    return data;
  },

  searchCandidates: async (search: string): Promise<StaffCandidate[]> => {
    const { data } = await api.get<{ data: StaffCandidate[] }>('/admin/staff/search', { params: { search } });
    return data.data;
  },

  promote: async (userId: number, role: string): Promise<{ message: string }> => {
    const { data } = await api.post(`/admin/staff/${userId}/promote`, { role });
    return data;
  },

  demote: async (userId: number): Promise<{ message: string }> => {
    const { data } = await api.post(`/admin/staff/${userId}/demote`);
    return data;
  },

  batchUpdate: async (roles: Record<number, string>): Promise<{ message: string; updated_count: number }> => {
    const { data } = await api.patch('/admin/staff/batch-update', { roles });
    return data;
  },
};