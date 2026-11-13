// lib/api/dashboard.ts
import api from "@/lib/api";

export interface RecentUser {
  id: number;
  name: string;
  slug: string;
  created_at: string;
  avatar_url: string;
  is_online: boolean;
}

export interface RecentLog {
  id: number;
  action: string;
  created_at: string;
  admin: {
    name: string;
    avatar_url: string;
  } | null;
}

export interface DashboardStats {
  onlineUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  newUsersMonth: number;
  
  pendingPhotos: number;
  pendingPhotoComments: number;
  pendingDiaries: number;
  pendingDiaryComments: number;
  pendingReports: number;
  unreadTickets: number;

  recentUsers: RecentUser[];
  recentLogs?: RecentLog[];

  activityData?: {
    swipes: number[];
    matches: number[];
    messages: number[];
    categories: string[];
  };

  revenueToday?: number;
  revenueMonth?: number;
  revenue30DaysTotal?: number;
  registrations30DaysTotal?: number;

  registrationData?: number[];
  registrationCategories?: string[];
  revenueData?: number[];
  revenueCategories?: string[];

  genderStats?: Record<string, number>;
  ageStats?: Record<string, number>;
  topCities?: Record<string, number>;
}

export const dashboardApi = {
  getStats: async () => {
    const { data } = await api.get<DashboardStats>('/admin/dashboard/stats');
    return data;
  },
};