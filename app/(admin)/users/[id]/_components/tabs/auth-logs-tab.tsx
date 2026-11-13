"use client";

// app/(admin)/users/[id]/_components/tabs/auth-logs-tab.tsx
//
// Таб «История входов»: user_auth_logs пользователя, включая неудачные
// попытки (антифрод-контекст).
//
// Per-user листинг: GET /admin/users/{userId}/auth-logs?outcome=&page=
// (UserListingsController::authLogs).

import { CheckCircle2, Monitor, Smartphone, Tablet, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { StatusTabs, type StatusTabDef } from "@/components/admin/status-tabs";
import { TableEmptyRow, TableLoadingRow } from "@/components/admin/table-states";
import { TabError } from "@/components/admin/tab-states";
import { useTabUrl, parseEnumParam, parsePageParam } from "@/hooks/admin/use-tab-url";
import { useUserAuthLogs } from "@/hooks/admin/use-users";
import { formatDateTime } from "@/lib/format";
import type { UserAuthLogOutcome } from "@/lib/api/users";

interface AuthLogsTabProps {
  userId: number;
}

const OUTCOME_VALUES = ["all", "success", "failed"] as const;

const OUTCOME_TABS: ReadonlyArray<StatusTabDef<UserAuthLogOutcome>> = [
  { value: "all",     label: "Все",        icon: Monitor, iconColor: "text-muted-foreground" },
  { value: "success", label: "Успешные",   icon: CheckCircle2, iconColor: "text-green-500" },
  { value: "failed",  label: "Неудачные",  icon: XCircle, iconColor: "text-red-500" },
];

function DeviceIcon({ deviceType }: { deviceType: string | null }) {
  const t = (deviceType ?? "").toLowerCase();
  if (t.includes("mobile") || t.includes("phone")) return <Smartphone className="w-4 h-4" />;
  if (t.includes("tablet")) return <Tablet className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
}

export function AuthLogsTab({ userId }: AuthLogsTabProps) {
  const basePath = `/users/${userId}/auth-logs`;
  const { searchParams, replace } = useTabUrl(basePath);

  const outcome = parseEnumParam(searchParams, "outcome", OUTCOME_VALUES, "all");
  const page = parsePageParam(searchParams);

  const { data, isLoading, isError, refetch } = useUserAuthLogs(userId, {
    outcome,
    page,
  });

  if (isError) return <TabError label="Не удалось загрузить историю входов" onRetry={refetch} />;

  const logs = data?.data ?? [];
  const counts = data?.counts;

  return (
    <div className="space-y-6">
      <StatusTabs
        tabs={OUTCOME_TABS}
        value={outcome}
        onChange={(next) =>
          replace((p) => {
            if (next !== "all") p.set("outcome", next);
            else p.delete("outcome");
            p.delete("page");
          })
        }
        getCount={(v) =>
          v === "all" ? counts?.total : v === "success" ? counts?.success : counts?.failed
        }
      />

      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <Table className="w-full min-w-160">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-40">Дата</TableHead>
              <TableHead className="w-36">IP</TableHead>
              <TableHead className="w-44">Устройство</TableHead>
              <TableHead>User-Agent</TableHead>
              <TableHead className="w-28">Результат</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRow colSpan={5} />
            ) : logs.length === 0 ? (
              <TableEmptyRow colSpan={5} title="Записей нет" />
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.ip_address}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <DeviceIcon deviceType={log.device_type} />
                      {log.device_os ?? log.device_type ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-80">
                    <span
                      className="text-xs text-muted-foreground block truncate"
                      title={log.user_agent ?? undefined}
                    >
                      {log.user_agent ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {log.is_successful ? (
                      <Badge variant="success">успех</Badge>
                    ) : (
                      <Badge variant="destructive">провал</Badge>
                    )}
                  </TableCell>
                </TableRow>
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
    </div>
  );
}
