// app/(admin)/dashboard/_components/dashboard-kpis.tsx
import { Card } from "@/components/ui/card";
import { Users, Image as ImageIcon, BookOpen, Flag, LifeBuoy, UserPlus } from "lucide-react";
import type { DashboardStats } from "@/lib/api/dashboard";

interface DashboardKpisProps {
  stats: DashboardStats;
  role: string;
}

export function DashboardKpis({ stats, role }: DashboardKpisProps) {
  // ============================================================
  // АДМИН (6 карточек в 3 колонки)
  // ============================================================
  if (role === 'admin') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Новые юзеры (24ч)</p>
              <p className="text-3xl font-bold mt-1 text-blue-500">+{stats.newUsersToday}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10"><Users className="w-5 h-5 text-blue-500" /></div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-3 text-xs">
            <span className="text-muted-foreground">Неделя: <span className="text-foreground font-medium">{stats.newUsersWeek}</span></span>
            <span className="text-muted-foreground">Месяц: <span className="text-foreground font-medium">{stats.newUsersMonth}</span></span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Модерация: Фото</p>
              <p className="text-3xl font-bold mt-1 text-yellow-500">{stats.pendingPhotos + stats.pendingPhotoComments}</p>
            </div>
            <div className="p-2 rounded-lg bg-yellow-500/10"><ImageIcon className="w-5 h-5 text-yellow-500" /></div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="text-muted-foreground">{stats.pendingPhotos} фото / {stats.pendingPhotoComments} комм.</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Модерация: Дневники</p>
              <p className="text-3xl font-bold mt-1 text-indigo-500">{stats.pendingDiaries + stats.pendingDiaryComments}</p>
            </div>
            <div className="p-2 rounded-lg bg-indigo-500/10"><BookOpen className="w-5 h-5 text-indigo-500" /></div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="text-muted-foreground">{stats.pendingDiaries} постов / {stats.pendingDiaryComments} комм.</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Жалобы (Ожидают)</p>
              <p className="text-3xl font-bold mt-1 text-red-500">{stats.pendingReports}</p>
            </div>
            <div className="p-2 rounded-lg bg-red-500/10"><Flag className="w-5 h-5 text-red-500" /></div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="text-muted-foreground">Ожидают обработки</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Тикеты поддержки</p>
              <p className="text-3xl font-bold mt-1 text-purple-500">{stats.unreadTickets}</p>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/10"><LifeBuoy className="w-5 h-5 text-purple-500" /></div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="text-muted-foreground">Непрочитанных сообщений</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Онлайн сейчас</p>
              <p className="text-3xl font-bold mt-1 text-green-500">{stats.onlineUsers}</p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10">
              <div className="w-5 h-5 relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-3 text-xs">
            <span className="text-muted-foreground">Неделя: <span className="text-foreground font-medium">+{stats.newUsersWeek}</span></span>
            <span className="text-muted-foreground">Месяц: <span className="text-foreground font-medium">+{stats.newUsersMonth}</span></span>
          </div>
        </Card>
      </div>
    );
  }

  // ============================================================
  // МОДЕРАТОР (4 карточки в 4 колонки)
  // ============================================================
  if (role === 'moderator') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Фото на проверке</p>
              <p className="text-3xl font-bold mt-1 text-yellow-500">{stats.pendingPhotos + stats.pendingPhotoComments}</p>
            </div>
            <div className="p-2 rounded-lg bg-yellow-500/10"><ImageIcon className="w-5 h-5 text-yellow-500" /></div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="text-muted-foreground">{stats.pendingPhotos} фото / {stats.pendingPhotoComments} комм.</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Дневники на проверке</p>
              <p className="text-3xl font-bold mt-1 text-blue-500">{stats.pendingDiaries + stats.pendingDiaryComments}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10"><BookOpen className="w-5 h-5 text-blue-500" /></div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="text-muted-foreground">{stats.pendingDiaries} постов / {stats.pendingDiaryComments} комм.</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Жалобы (Ожидают)</p>
              <p className="text-3xl font-bold mt-1 text-red-500">{stats.pendingReports}</p>
            </div>
            <div className="p-2 rounded-lg bg-red-500/10"><Flag className="w-5 h-5 text-red-500" /></div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="text-muted-foreground">Ожидают обработки</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Онлайн сейчас</p>
              <p className="text-3xl font-bold mt-1 text-green-500">{stats.onlineUsers}</p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10">
              <div className="w-5 h-5 relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="text-muted-foreground">+{stats.newUsersToday} новых за 24ч</span>
          </div>
        </Card>
      </div>
    );
  }

    // ============================================================
  // САППОРТ (3 карточки в 3 колонки)
  // ============================================================
  if (role === 'support') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Непрочитанные тикеты</p>
              <p className="text-3xl font-bold mt-1 text-red-500">{stats.unreadTickets}</p>
            </div>
            <div className="p-2 rounded-lg bg-red-500/10"><LifeBuoy className="w-5 h-5 text-red-500" /></div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="text-muted-foreground">Требуют ответа</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Новые юзеры (24ч)</p>
              <p className="text-3xl font-bold mt-1 text-blue-500">+{stats.newUsersToday}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10"><UserPlus className="w-5 h-5 text-blue-500" /></div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="text-muted-foreground">За неделю: {stats.newUsersWeek}</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Онлайн сейчас</p>
              <p className="text-3xl font-bold mt-1 text-green-500">{stats.onlineUsers}</p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10">
              <div className="w-5 h-5 relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="text-muted-foreground">За неделю: +{stats.newUsersWeek}</span>
          </div>
        </Card>
      </div>
    );
  }

  // Если роль не определена
  return null;
}