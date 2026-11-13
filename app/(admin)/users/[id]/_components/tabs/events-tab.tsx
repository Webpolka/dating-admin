"use client";

// app/(admin)/users/[id]/_components/tabs/events-tab.tsx
//
// Таб «Лента событий»: активность пользователя (user_events).
//
// Per-user листинг: GET /admin/users/{userId}/events?page=
// (UserListingsController::events). Типы событий — App\Enums\UserEventType
// (лейблы ниже синхронизированы с enum).

import {
  CalendarHeart,
  Camera,
  CheckCircle2,
  Crown,
  FileText,
  Sparkles,
  Star,
} from "lucide-react";

import { MiniPagination } from "@/components/admin/mini-pagination";
import { TabError, TabLoading } from "@/components/admin/tab-states";
import { useTabUrl, parsePageParam } from "@/hooks/admin/use-tab-url";
import { useUserEvents } from "@/hooks/admin/use-users";
import { formatDateTime, formatRelativeTime } from "@/lib/format";

interface EventsTabProps {
  userId: number;
}

/** Лейблы типов событий — 1:1 с App\Enums\UserEventType. */
const EVENT_META: Record<string, { label: string; icon: typeof Star; color: string }> = {
  photo_updated:     { label: "Фото обновлено",      icon: Camera,          color: "text-blue-500" },
  status_changed:    { label: "Статус изменён",      icon: Sparkles,        color: "text-purple-500" },
  vip_purchased:     { label: "Куплен VIP",          icon: Star,            color: "text-amber-500" },
  premium_purchased: { label: "Куплен Premium",      icon: Crown,           color: "text-orange-500" },
  diary_created:     { label: "Создан дневник",      icon: FileText,        color: "text-emerald-500" },
  profile_completed: { label: "Анкета заполнена",    icon: CheckCircle2,    color: "text-green-500" },
  birthday:          { label: "День рождения",       icon: CalendarHeart,   color: "text-pink-500" },
};

function EventRow({
  event,
}: {
  event: {
    id: number;
    type: string;
    properties: Record<string, unknown> | null;
    created_at: string | null;
  };
}) {
  const meta = EVENT_META[event.type];
  const Icon = meta?.icon ?? Sparkles;

  return (
    <div className="flex items-start gap-3 p-3 border border-border rounded-lg bg-card">
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${meta?.color ?? "text-muted-foreground"}`} />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{meta?.label ?? event.type}</span>
          <span
            className="text-xs text-muted-foreground"
            title={formatDateTime(event.created_at)}
          >
            {formatRelativeTime(event.created_at)}
          </span>
        </div>
        {event.properties && Object.keys(event.properties).length > 0 && (
          <p className="text-xs text-muted-foreground break-all">
            {Object.entries(event.properties)
              .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
              .join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

export function EventsTab({ userId }: EventsTabProps) {
  const basePath = `/users/${userId}/events`;
  const { searchParams, replace } = useTabUrl(basePath);

  const page = parsePageParam(searchParams);

  const { data, isLoading, isError, refetch } = useUserEvents(userId, { page });

  if (isLoading || !data) return <TabLoading label="Загрузка ленты событий..." />;
  if (isError) return <TabError label="Не удалось загрузить ленту событий" onRetry={refetch} />;

  const events = data.data;

  return (
    <div className="space-y-6">
      {events.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12">
          Лента событий пуста.
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
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
    </div>
  );
}
