// app/(admin)/dashboard/_components/dashboard-page-client.tsx
"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { dashboardApi, type DashboardStats } from "@/lib/api/dashboard";
import { useAdminUser } from "@/components/admin/admin-user-context";
import { RefreshCw, Trash2 ,Loader2} from "lucide-react";
 

import api, { isApiError } from "@/lib/api";
import type { ApiError } from "@/lib/types";

import { DashboardKpis } from "./dashboard-kpis";
import { DashboardCharts } from "./dashboard-charts";
import { DashboardFeeds } from "./dashboard-feeds";

export function DashboardPageClient() {
  const queryClient = useQueryClient();
  const [isClearing, setIsClearing] = useState(false); 
  const user = useAdminUser();
  const role = user?.is_founder ? 'admin' : user?.role || 'user';

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: dashboardApi.getStats,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    toast.success('Данные обновлены!');
  };

    const handleClearCache = async () => {
    setIsClearing(true); // ← ВКЛЮЧАЕМ СПИННЕР
    try {
      const response = await api.post('/admin/system/clear-cache');
      toast.success(response.data.message);
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    } catch (error: unknown) {
      if (isApiError(error)) {
        const errData = error.response?.data as ApiError;
        toast.error(errData?.message || 'Ошибка при очистке кэша');
      } else {
        toast.error('Произошла неизвестная ошибка.');
      }
    } finally {
      setIsClearing(false); // ← ВЫКЛЮЧАЕМ СПИННЕР
    }
  };
  
 
if (!user || isLoading || !data) {
  return (
    <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
    </div>
  );
}

  const stats: DashboardStats = data;

  // Проверка роли для отображения
  const isAdmin = role === 'admin';

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Дашборд</h1>
          <p className="text-sm text-muted-foreground">Сводка данных проекта в реальном времени</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearCache} 
              disabled={isClearing}
              className="gap-2"
            >
              {isClearing ? (
                <RefreshCw className="w-4 h-4 animate-spin" /> // ← СПИННЕР
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Очистить кеш</span>
            </Button>
          )}
          <Button variant="default" size="sm" onClick={handleRefresh} disabled={isFetching} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Обновить</span>
          </Button>
        </div>
      </div>

      {/* ВИДЖЕТЫ (KPI) */}
      <DashboardKpis stats={stats} role={role} />

      {/* ГРАФИКИ (По ролям) */}
      <DashboardCharts stats={stats} role={role} />
      
      {/* ЛЕНТЫ (По ролям) */}
      <DashboardFeeds stats={stats} role={role} />
  </div>        
  );
}