// lib/api/settings.ts
import api from "@/lib/api";

export type SettingValue = string | number | boolean;

export interface SettingItem {
  id: number;
  key: string;
  // F4: строгий тип вместо any.
  value: SettingValue;
  type: string;
  label: string;
  description?: string;
  options?: Record<string, string>;
  is_public: boolean;
}

export interface SettingGroup {
  key: string;
  label: string;
}

export const settingsApi = {
  getGroups: async () => {
    const { data } = await api.get<SettingGroup[]>('/admin/settings/groups');
    return data;
  },
  getSettings: async (group: string) => {
    const { data } = await api.get<SettingItem[]>('/admin/settings', { params: { group } });
    return data;
  },
  save: async (group: string, settings: SettingItem[]) => {
    const { data } = await api.post('/admin/settings', { group, settings });
    return data;
  },
  reset: async (group: string) => {
    const { data } = await api.post('/admin/settings/reset', { group });
    return data;
  },
};