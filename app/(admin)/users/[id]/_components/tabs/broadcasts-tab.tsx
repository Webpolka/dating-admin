"use client";

// app/(admin)/users/[id]/_components/tabs/broadcasts-tab.tsx
//
// Таб «Уведомления»: персональные рассылки, адресованные пользователю.
//
// Per-user листинг: GET /admin/users/{userId}/broadcasts?page=
// (UserListingsController::broadcasts — только рассылки с
// target_audience.user_id = userId; массовые сюда не входят).
// Управление — в глобальном разделе /system/broadcasts.

import { Bell, Clock, Send } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { TabError, TabLoading } from "@/components/admin/tab-states";
import { useTabUrl, parsePageParam } from "@/hooks/admin/use-tab-url";
import { useUserBroadcasts } from "@/hooks/admin/use-users";
import { formatDateTime } from "@/lib/format";

interface BroadcastsTabProps {
  userId: number;
}

function BroadcastStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "sent":      return <Badge variant="success">Отправлена</Badge>;
    case "sending":   return <Badge variant="warning">Отправляется</Badge>;
    case "scheduled": return <Badge variant="secondary">Запланирована</Badge>;
    case "failed":    return <Badge variant="destructive">Ошибка</Badge>;
    case "draft":     return <Badge variant="outline">Черновик</Badge>;
    default:          return <Badge variant="secondary">{status}</Badge>;
  }
}

export function BroadcastsTab({ userId }: BroadcastsTabProps) {
  const basePath = `/users/${userId}/broadcasts`;
  const { searchParams, replace } = useTabUrl(basePath);

  const page = parsePageParam(searchParams);

  const { data, isLoading, isError, refetch } = useUserBroadcasts(userId, { page });

  if (isLoading || !data) return <TabLoading label="Загрузка рассылок..." />;
  if (isError) return <TabError label="Не удалось загрузить рассылки" onRetry={refetch} />;

  const broadcasts = data.data;

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Персональные рассылки, адресованные этому пользователю.
      </p>

      {broadcasts.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12">
          Персональных рассылок не было.
        </div>
      ) : (
        <div className="space-y-2">
          {broadcasts.map((b) => (
            <div
              key={b.id}
              className="p-4 border border-border rounded-lg bg-card space-y-2"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <Bell className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{b.title}</span>
                </div>
                <BroadcastStatusBadge status={b.status} />
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">{b.message}</p>

              <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{b.audience_label}</span>
                {b.sent_at ? (
                  <span className="inline-flex items-center gap-1">
                    <Send className="w-3.5 h-3.5" />
                    отправлена {formatDateTime(b.sent_at)}
                  </span>
                ) : b.scheduled_at ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    запланирована на {formatDateTime(b.scheduled_at)}
                  </span>
                ) : null}
                {b.total_recipients > 0 && (
                  <span>
                    доставлено {b.sent_count}/{b.total_recipients}
                    {b.failed_count > 0 && ` (ошибок: ${b.failed_count})`}
                  </span>
                )}
                {b.admin && <span>автор: {b.admin.name}</span>}
                <span>создана {formatDateTime(b.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <MiniPagination
        currentPage={data.current_page}
        lastPage={data.last_page}
        from={data.from}
        to={data.to}
        total={data.total}
        onChangePage={(next) => replace((p) => (next <= 1 ? p.delete("page") : p.set("page", String(next))))}
      />

      <div className="text-xs text-muted-foreground">
        <Link
          href="/system/broadcasts"
          className="hover:text-foreground underline underline-offset-2"
        >
          Управлять рассылками в разделе «Рассылки»
        </Link>
      </div>
    </div>
  );
}
