"use client";

// app/(admin)/users/[id]/_components/tabs/events-tab.tsx
//
// Таб «Лента событий»: активность пользователя (user_events).
//
// Per-user листинг: GET /admin/users/{userId}/events?page=
// (UserListingsController::events). meta (title/icon/color) — с бэка, из
// App\Enums\V1\UserEventType (label()/icon()/color()). Для типов вне enum —
// fallback: title=ucfirst(str_replace('_',' ',$type)), icon='activity',
// color='bg-primary/10 text-primary' (зеркало blade-эталона).
//
// Зеркало blade: вертикальный таймлайн (псевдо-линия слева), точка-круг с
// иконкой (meta.color + иконка по meta.icon), заголовок (meta.title),
// моно-бейдж raw type, дата. <details>-аккордеон раскрывает properties
// (key→value таблицей).

import { useState, type ComponentType } from "react";
import {
  Activity, BookOpen, Cake, CheckCircle2, ChevronRight, Circle,
  Crown, Edit, Image as ImageIcon, Star,
  type LucideProps,
} from "lucide-react";

import { MiniPagination } from "@/components/admin/mini-pagination";
import { TabError, TabLoading } from "@/components/admin/tab-states";
import { useTabUrl, parsePageParam } from "@/hooks/admin/use-tab-url";
import { useUserEvents } from "@/hooks/admin/use-users";
import { formatDateTime } from "@/lib/format";
import type { UserEventItem } from "@/lib/api/users";

interface EventsTabProps {
  userId: number;
}

/**
 * Мапа: имя иконки (строкой из UserEventType::icon()) → компонент lucide.
 *
 * Бэк отдаёт имена из enum: 'image','edit','crown','star','book-open',
 * 'check-circle','cake'. Для fallback-иконки 'activity' и неизвестных имён —
 * Circle (как AdminLogMeta default).
 *
 * 'image' замаплен на ImageIcon (Image занят глобальным next/image — alias
 * обязателен, как в user-tabs-nav.tsx и admin-logs-tab.tsx).
 */
const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  image:         ImageIcon,
  edit:          Edit,
  crown:         Crown,
  star:          Star,
  "book-open":   BookOpen,
  "check-circle": CheckCircle2,
  cake:          Cake,
  activity:      Activity,
  circle:        Circle,
};

function getIcon(name: string): ComponentType<LucideProps> {
  return ICON_MAP[name] ?? Activity;
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
    <div className="space-y-4">
      {events.length === 0 ? (
        <div className="p-4 bg-muted/20 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
          Лента событий пуста.
        </div>
      ) : (
        // Вертикальный таймлайн: псевдо-линия через before:absolute по левому краю.
        <div className="space-y-4 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-border">
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

// ============================================
// СТРОКА ТАЙМЛАЙНА (точка + содержимое + аккордеон properties)
// ============================================

function EventRow({ event }: { event: UserEventItem }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = getIcon(event.meta.icon);
  const hasProperties = Boolean(event.properties && Object.keys(event.properties).length > 0);

  return (
    <div className="flex gap-4 items-start relative">
      {/* Точка таймлайна: круг с иконкой (поверх линии) */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0 ${event.meta.color}`}
      >
        <Icon className="w-4 h-4" />
      </div>

      {/* Содержимое */}
      <div className="flex-1 pt-1 min-w-0 space-y-2">
        {/* Заголовок + raw type + дата */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium truncate">{event.meta.title}</span>
            <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
              {event.type}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap" title={event.created_at ?? undefined}>
            {event.created_at ? formatDateTime(event.created_at) : "—"}
          </span>
        </div>

        {/* Аккордеон properties (key→value, как в blade) */}
        {hasProperties && (
          <details
            open={expanded}
            onToggle={(e) => setExpanded((e.currentTarget as HTMLDetailsElement).open)}
            className="group mt-2"
          >
            <summary className="cursor-pointer text-xs text-blue-500 hover:underline flex items-center gap-1 select-none list-none">
              <ChevronRight
                className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
              />
              Показать детали
            </summary>
            <div className="mt-2 bg-muted/20 border border-border rounded-md p-3 space-y-1">
              {event.properties &&
                Object.entries(event.properties).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-start text-xs gap-2">
                    <span className="text-muted-foreground capitalize mr-2">
                      {key.replace(/_/g, " ")}:
                    </span>
                    <span className="font-medium text-foreground text-right">
                      {typeof value === "object" && value !== null
                        ? JSON.stringify(value)
                        : String(value)}
                    </span>
                  </div>
                ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
