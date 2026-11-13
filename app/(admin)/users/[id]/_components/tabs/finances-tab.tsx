"use client";

// app/(admin)/users/[id]/_components/tabs/finances-tab.tsx
//
// Таб «Финансы»: транзакции пользователя.
//
// Per-user листинг: GET /admin/users/{userId}/transactions?status=&page=
// (UserListingsController::transactions, формат айтемов 1:1 с глобальным
// списком — те же type_badge / status_badge / formatted_amount).
// Действия (sync/refund) — в глобальном разделе /finance/transactions
// (ссылка внизу ведёт туда с поиском по ID юзера).

import { Wallet } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { StatusTabs, type StatusTabDef } from "@/components/admin/status-tabs";
import { TableEmptyRow, TableLoadingRow } from "@/components/admin/table-states";
import { TabError } from "@/components/admin/tab-states";
import { useTabUrl, parseEnumParam, parsePageParam } from "@/hooks/admin/use-tab-url";
import { useUserTransactions } from "@/hooks/admin/use-users";
import { formatDateTime } from "@/lib/format";
import type { UserTransactionTabStatus } from "@/lib/api/users";

interface FinancesTabProps {
  userId: number;
}

const STATUS_VALUES = ["all", "success", "pending", "failed", "refunded"] as const;

const STATUS_TABS: ReadonlyArray<StatusTabDef<UserTransactionTabStatus>> = [
  { value: "all",      label: "Все",        icon: Wallet, iconColor: "text-muted-foreground" },
  { value: "success",  label: "Успешные",   icon: Wallet, iconColor: "text-green-500" },
  { value: "pending",  label: "Ожидают",    icon: Wallet, iconColor: "text-yellow-500" },
  { value: "failed",   label: "Неудачные",  icon: Wallet, iconColor: "text-red-500" },
  { value: "refunded", label: "Возвраты",   icon: Wallet, iconColor: "text-blue-500" },
];

export function FinancesTab({ userId }: FinancesTabProps) {
  const basePath = `/users/${userId}/finances`;
  const { searchParams, replace } = useTabUrl(basePath);

  const status = parseEnumParam(searchParams, "status", STATUS_VALUES, "all");
  const page = parsePageParam(searchParams);

  const { data, isLoading, isError, refetch, isFetching } = useUserTransactions(userId, {
    status,
    page,
  });

  if (isError) return <TabError label="Не удалось загрузить транзакции" onRetry={refetch} />;

  const transactions = data?.data ?? [];
  const counts = data?.counts;

  return (
    <div className="space-y-6">
      <StatusTabs
        tabs={STATUS_TABS}
        value={status}
        onChange={(next) =>
          replace((p) => {
            if (next !== "all") p.set("status", next);
            else p.delete("status");
            p.delete("page");
          })
        }
        getCount={(v) => (v === "all" ? counts?.all : counts?.[v])}
      />

      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <Table className="w-full min-w-160">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-16">ID</TableHead>
              <TableHead className="w-30">Тип</TableHead>
              <TableHead className="w-32">Сумма</TableHead>
              <TableHead className="w-30">Статус</TableHead>
              <TableHead className="w-40">Провайдер</TableHead>
              <TableHead>Дата</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRow colSpan={6} />
            ) : transactions.length === 0 ? (
              <TableEmptyRow colSpan={6} title="Нет транзакций" />
            ) : (
              transactions.map((t) => (
                <TableRow key={t.id} className={isFetching ? "opacity-60" : undefined}>
                  <TableCell className="font-mono text-xs">#{t.id}</TableCell>
                  <TableCell>
                    <Badge variant={t.type_badge.variant as "default"} className={t.type_badge.className}>
                      {t.type_badge.label}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-sm tabular-nums ${t.amount_class}`}>
                    {t.formatted_amount}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.status_badge.variant as "default"}>{t.status_badge.label}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.provider ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(t.created_at)}
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

      <div className="text-xs text-muted-foreground">
        <Link
          href={`/finance/transactions?q=${userId}`}
          className="hover:text-foreground underline underline-offset-2"
        >
          Открыть в разделе «Финансы» (синхронизация, возвраты)
        </Link>
      </div>
    </div>
  );
}
