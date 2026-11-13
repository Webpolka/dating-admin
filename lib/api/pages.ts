// lib/api/pages.ts
import api from "@/lib/api";

export interface PageListItem {
  id: number;
  title: string;
  slug: string;
  meta_description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PageFormData {
  title: string;
  meta_title: string;
  slug: string;
  body: string;
  meta_description: string;
  is_active: boolean;
}

export interface PageDetail extends PageFormData {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface PagesResponse {
  pages: PageListItem[];
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
  counts: {
    all: number;
    active: number;
    draft: number;
  };
}

export const pagesApi = {
  getPages: async (params: { search?: string; status?: string; page?: number; per_page?: number }) => {
    const { data } = await api.get<PagesResponse>('/admin/pages', { params });
    return data;
  },
  getPage: async (id: number) => {
    const { data } = await api.get<PageDetail>(`/admin/pages/${id}`);
    return data;
  },
  create: async (pageData: PageFormData) => {
    const { data } = await api.post('/admin/pages', pageData);
    return data;
  },
  update: async (id: number, pageData: PageFormData) => {
    const { data } = await api.put(`/admin/pages/${id}`, pageData);
    return data;
  },
  delete: async (id: number) => {
    const { data } = await api.delete(`/admin/pages/${id}`);
    return data;
  },
  toggleStatus: async (id: number) => {
    const { data } = await api.post(`/admin/pages/${id}/toggle-status`);
    return data;
  },
  duplicate: async (id: number) => {
    const { data } = await api.post(`/admin/pages/${id}/duplicate`);
    return data;
  },
  bulkAction: async (ids: number[], action: string) => {
    const { data } = await api.post('/admin/pages/bulk', { ids, action });
    return data;
  },
};