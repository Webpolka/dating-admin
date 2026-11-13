"use client";

// app/(admin)/users/[id]/_components/tabs/admin-logs-tab.tsx
//
// Таб «Логи админов»: все действия администрации над пользователем.
//
// Per-user листинг: GET /admin/users/{userId}/admin-logs?page=
// (UserListingsController::adminLogs — ВСЕ действия, без фильтра по
// action, в отличие от таба «Статус и Баны», где только ban-семейство).
// Формат строк идентичен ban-history — те же before/after диффы.

import { useState } from "react";
import { ChevronDown, ChevronRight, History, UserCog } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { TabError, TabLoading } from "@/components/admin/tab-states";
import { useTabUrl, parsePageParam } from "@/hooks/admin/use-tab-url";
import { useUserAdminLogs } from "@/hooks/admin/use-users";
import { formatDateTime } from "@/lib/format";

interface AdminLogsTabProps {
  userId: number;
}

/** Цвет action-бейджа по префиксу (тот же принцип, что в bans-tab). */
function ActionBadge({ action }: { action: string }) {
  let variant: "default" | "destructive" | "secondary" | "success" | "warning" | "outline" = "secondary";
  if (action.startsWith("user.ban") || action.startsWith("user.mass_ban")) variant = "destructive";
  else if (action.startsWith("user.unban") || action.startsWith("user.restore")) variant = "success";
  else if (action.startsWith("user.delete") || action.startsWith("user.mass_delete")) variant = "warning";
  else if (action.startsWith("photo.") || action.startsWith("diary.") || action.startsWith("report.")) variant = "outline";
  return <Badge variant={variant}>{action}</Badge>;
}

/** Компактный дифф before/after: только изменившиеся ключи. */
function DiffBlock({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <code className="break-all">{JSON.stringify(value)}</code>
    </div>
  );
}

function LogRow({
  log,
}: {
  log: {
    id: number;
    action: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string;
    admin: { id: number; name: string } | null;
  };
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDiff = Boolean(log.before || log.after);

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => hasDiff && setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
      >
        {hasDiff ? (
          expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )
        ) : (
          <span className="w-4" />
        )}
        <ActionBadge action={log.action} />
        <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">
          {log.admin ? (
            <span className="inline-flex items-center gap-1">
              <UserCog className="w-3.5 h-3.5" />
              {log.admin.name}
            </span>
          ) : (
            "система"
          )}
        </span>
        <span className="text-xs text-muted-foreground hidden sm:inline">{log.ip_address ?? "—"}</span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDateTime(log.created_at)}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border space-y-1 bg-muted/20">
          {log.before && <DiffBlock label="before" value={log.before} />}
          {log.after && <DiffBlock label="after" value={log.after} />}
        </div>
      )}
    </div>
  );
}

export function AdminLogsTab({ userId }: AdminLogsTabProps) {
  const basePath = `/users/${userId}/admin-logs`;
  const { searchParams, replace } = useTabUrl(basePath);

  const page = parsePageParam(searchParams);

  const { data, isLoading, isError, refetch } = useUserAdminLogs(userId, { page });

  if (isLoading || !data) return <TabLoading label="Загрузка логов..." />;
  if (isError) return <TabError label="Не удалось загрузить логи" onRetry={refetch} />;

  const logs = data.data;

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <History className="w-3.5 h-3.5" />
        Полная история действий администрации над пользователем. Клик по строке — дифф before/after.
      </p>

      {logs.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12">
          Действий администрации над этим пользователем не было.
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <LogRow key={log.id} log={log} />
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
