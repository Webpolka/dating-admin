"use client";

// app/(admin)/users/[id]/_components/tabs/broadcasts-tab.tsx
//
// Таб «Уведомления»: рассылки, адресованные пользователю.
//
// Per-user листинг: GET /admin/users/{userId}/broadcasts?filter=&page=
// (UserListingsController::broadcasts — single-list с фильтром по каналу
// all|in_app|push|email; включает и персональные (target_audience.user_id),
// и массовые (target_audience пуст → «всем», юзер тоже получил)).
// Управление — в глобальном разделе /system/broadcasts.
//
// Зеркало blade-эталона: кнопки фильтра по типу канала сверху (со счётчиками),
// таблица снизу — ID (ссылка), тип-бейдж, содержание (title + message), статус
// (с прогресс-баром для sending), дата (diffForHumans).

import { Bell, Mail, Smartphone } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { TableEmptyRow, TableLoadingRow } from "@/components/admin/table-states";
import { TabError } from "@/components/admin/tab-states";
import { useTabUrl, parsePageParam, parseEnumParam } from "@/hooks/admin/use-tab-url";
import { useUserBroadcasts } from "@/hooks/admin/use-users";
import { formatRelativeTime } from "@/lib/format";
import type { UserBroadcastsParams } from "@/lib/api/users";

interface BroadcastsTabProps {
  userId: number;
}

const FILTER_VALUES = ["all", "in_app", "email", "push"] as const;

const EMPTY_TEXT: Record<string, string> = {
  all:    "Пользователь не получал рассылок.",
  in_app: "Нет уведомлений в приложении.",
  email:  "Нет отправленных Email-писем.",
  push:   "Нет отправленных Push-уведомлений.",
};

const TYPE_META: Record<string, { label: string; icon: typeof Bell; variant: "secondary" | "warning" | "default" }> = {
  in_app: { label: "Site",  icon: Bell,      variant: "secondary" },
  email:  { label: "Email", icon: Mail,      variant: "warning" },
  push:   { label: "Push",  icon: Smartphone, variant: "default" },
};

export function BroadcastsTab({ userId }: BroadcastsTabProps) {
  const basePath = `/users/${userId}/broadcasts`;
  const { searchParams, replace } = useTabUrl(basePath);

  const filter = parseEnumParam(searchParams, "filter", FILTER_VALUES, "all");
  const page = parsePageParam(searchParams);

  const { data, isLoading, isError, refetch } = useUserBroadcasts(userId, { filter, page });

  if (isError) return <TabError label="Не удалось загрузить рассылки" onRetry={refetch} />;

  const broadcasts = data?.data ?? [];
  const counts = data?.counts;

  const setFilter = (next: UserBroadcastsParams["filter"]) => {
    replace((p) => {
      if (next === "all") p.delete("filter");
      else p.set("filter", next);
      p.delete("page");
    });
  };

  const isFilterActive = (value: UserBroadcastsParams["filter"]) => filter === value;

  return (
    <div className="space-y-4">
      {/* === Кнопки фильтра по каналу === */}
      <div className="flex flex-wrap gap-1.5">
        <Button
          variant={isFilterActive("all") ? "default" : "secondary"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          Все уведомления <span className="opacity-70">({counts?.all ?? 0})</span>
        </Button>
        <Button
          variant={isFilterActive("in_app") ? "default" : "secondary"}
          size="sm"
          onClick={() => setFilter("in_app")}
        >
          <Bell className="w-3.5 h-3.5" /> Site <span className="opacity-70">({counts?.in_app ?? 0})</span>
        </Button>
        <Button
          variant={isFilterActive("email") ? "default" : "secondary"}
          size="sm"
          onClick={() => setFilter("email")}
        >
          <Mail className="w-3.5 h-3.5" /> Email <span className="opacity-70">({counts?.email ?? 0})</span>
        </Button>
        <Button
          variant={isFilterActive("push") ? "default" : "secondary"}
          size="sm"
          onClick={() => setFilter("push")}
        >
          <Smartphone className="w-3.5 h-3.5" /> Push <span className="opacity-70">({counts?.push ?? 0})</span>
        </Button>
      </div>

      {/* === Таблица === */}
      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <Table className="w-full min-w-160">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-16">ID</TableHead>
              <TableHead className="w-28">Тип</TableHead>
              <TableHead>Содержание</TableHead>
              <TableHead className="w-36">Статус</TableHead>
              <TableHead className="w-28">Дата</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRow colSpan={5} />
            ) : broadcasts.length === 0 ? (
              <TableEmptyRow colSpan={5} title={EMPTY_TEXT[filter]} />
            ) : (
              broadcasts.map((b) => (
                <BroadcastRow key={b.id} b={b} />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && (
        <MiniPagination
          currentPage={data.current_page}
          lastPage={data.last_page}
          from={data.from}
          to={data.to}
          total={data.total}
          onChangePage={(next) => replace((p) => (next <= 1 ? p.delete("page") : p.set("page", String(next))))}
        />
      )}

      <div className="text-xs text-muted-foreground">
        <Link
          href="/system/broadcasts"
          className="hover:text-foreground underline underline-offset-2"
        >
          Управлять рассылками в разделе «Система → Рассылки»
        </Link>
      </div>
    </div>
  );
}

// ============================================
// СТРОКА РАССЫЛКИ
// ============================================

function BroadcastRow({
  b,
}: {
  b: {
    id: number;
    title: string | null;
    message: string | null;
    type: string;
    status: string;
    progress: number;
    sent_count: number;
    failed_count: number;
    total_recipients: number;
    scheduled_at: string | null;
    sent_at: string | null;
    created_at: string | null;
    admin: { id: number; name: string } | null;
  };
}) {
  const typeMeta = TYPE_META[b.type] ?? { label: b.type, icon: Bell, variant: "secondary" as const };
  const TypeIcon = typeMeta.icon;

  // Дата: prefer sent_at (когда реально ушло), иначе created_at (зеркало blade).
  const dateIso = b.sent_at ?? b.created_at;

  return (
    <TableRow>
      {/* ID → журнал рассылок */}
      <TableCell className="text-xs font-mono whitespace-nowrap">
        <Link
          href={`/system/broadcasts?q=${b.id}`}
          className="text-blue-500 hover:underline font-medium"
          title="Найти в журнале рассылок"
        >
          #{b.id}
        </Link>
      </TableCell>

      {/* Тип — цветной бейдж с иконкой */}
      <TableCell>
        <Badge variant={typeMeta.variant} className="gap-1">
          <TypeIcon className="w-3 h-3" />
          {typeMeta.label}
        </Badge>
      </TableCell>

      {/* Содержание: title + message (line-clamp) */}
      <TableCell>
        <div className="flex flex-col gap-1 max-w-[400px]">
          {b.title && (
            <span className="text-sm font-medium line-clamp-1 truncate break-words">{b.title}</span>
          )}
          {b.message && (
            <span
              className="text-xs text-muted-foreground italic line-clamp-1 truncate break-words"
              title={b.message}
            >
              «{b.message}»
            </span>
          )}
          {!b.title && !b.message && (
            <span className="text-xs text-muted-foreground/50 italic">Без содержания</span>
          )}
        </div>
      </TableCell>

      {/* Статус + прогресс (sending) + метрики (sent/failed) */}
      <TableCell>
        <StatusCell
          status={b.status}
          progress={b.progress}
          sentCount={b.sent_count}
          failedCount={b.failed_count}
          totalRecipients={b.total_recipients}
          scheduledAt={b.scheduled_at}
        />
      </TableCell>

      {/* Дата (diffForHumans — formatRelativeTime) */}
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap" title={dateIso ?? undefined}>
        {dateIso ? formatRelativeTime(dateIso) : "—"}
      </TableCell>
    </TableRow>
  );
}

// ============================================
// ЯЧЕЙКА СТАТУСА (с прогресс-баром для sending)
// ============================================

function StatusCell({
  status,
  progress,
  sentCount,
  failedCount,
  totalRecipients,
  scheduledAt,
}: {
  status: string;
  progress: number;
  sentCount: number;
  failedCount: number;
  totalRecipients: number;
  scheduledAt: string | null;
}) {
  switch (status) {
    case "draft":
      return <Badge variant="warning">Черновик</Badge>;

    case "scheduled":
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="secondary">Запланировано</Badge>
          {scheduledAt && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(scheduledAt).toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      );

    case "sending":
      return (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-blue-500 font-medium">
            Отправка... ({progress}%)
          </span>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground text-center">
            {sentCount} / {totalRecipients}
          </span>
        </div>
      );

    case "sent":
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="success">Отправлено</Badge>
          <span className="text-[10px] text-muted-foreground">{sentCount} доставлено</span>
          {failedCount > 0 && (
            <span className="text-[10px] text-destructive">{failedCount} ошибок</span>
          )}
        </div>
      );

    case "failed":
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="destructive">Ошибка</Badge>
          {failedCount > 0 && (
            <span className="text-[10px] text-destructive">Упало: {failedCount}</span>
          )}
        </div>
      );

    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}
