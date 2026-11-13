// app/(admin)/dashboard/_components/dashboard-feeds.tsx
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { History, UserPlus } from "lucide-react";
import type { DashboardStats } from "@/lib/api/dashboard";

interface DashboardFeedsProps {
  stats: DashboardStats;
  role: string;
}

export function DashboardFeeds({ stats, role }: DashboardFeedsProps) {
  const isAdmin = role === 'admin';
  const isSupport = role === 'support';

  // ============================================================
  // АДМИН И САППОРТ (Две колонки: Аудит + Регистрации)
  // ============================================================
  if (isAdmin || isSupport) {
    return (
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Лента аудита */}
          <div>
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <History className="w-4 h-4" /> Лента аудита
            </h3>
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
              {stats.recentLogs?.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className="shrink-0">
                    {log.admin ? (
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={log.admin.avatar_url || undefined} />
                        <AvatarFallback>{log.admin.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs">SYS</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{log.admin?.name || 'Система'}</span> выполнил(а)
                    </p>
                    <p className="text-[10px] font-mono text-blue-500 hover:underline truncate">{log.action}</p>
                    <p className="text-[10px] text-muted-foreground/70">{log.created_at}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Новые регистрации */}
          <div className="md:border-l md:pl-8">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Новые регистрации
            </h3>
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
              {stats.recentUsers.map((u) => (
                <Link href={`/users/${u.slug}`} key={u.id} className="flex items-center gap-3 group">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium group-hover:text-primary truncate">{u.name}</p>
                    <p className="text-[10px] text-muted-foreground">{u.created_at}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // ============================================================
  // МОДЕРАТОР (Сетка из одних регистраций на всю ширину)
  // ============================================================
  if (role === 'moderator') {
    return (
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Новые регистрации
        </h3>
        {/* ФИКС: 4 колонки, 4 ряда = 16 юзеров */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.recentUsers.map((u) => (
            <Link href={`/users/${u.slug}`} key={u.id} className="flex items-center gap-3 group bg-muted/30 p-2 rounded-md hover:bg-muted transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarImage src={u.avatar_url || undefined} />
                <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium group-hover:text-primary truncate">{u.name}</p>
                <p className="text-[10px] text-muted-foreground">{u.created_at}</p>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    );
  }

  return null;
}