// app/(admin)/finance/transactions/_components/transactions-page-client.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useTransactionsList,
  useSyncTransaction,
  useRefundTransaction,
  type TransactionItem,
  // type RefundReason,
  type DatePeriod,
  type TransactionsStats,
} from "@/hooks/admin/use-transactions";
import { UserBadge } from "@/components/admin/user-badge";
// import type { UserBadgeData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import { extractErrorMessage } from "@/lib/api";
import {
  ArrowLeft, Landmark, Search, X, Loader2, RefreshCw, Eye,
  Undo2, TrendingUp, AlertCircle,
} from "lucide-react";
import {
  SEARCH_DEBOUNCE_MS, PER_PAGE,
  STATUS_FILTERS, PERIOD_OPTIONS, TYPE_OPTIONS,
  // type StatusFilterValue,
} from "./_shared";
import { useTransactionPending } from "@/hooks/admin/use-transactions-pending";
import { TransactionDetailModal } from "./transaction-detail-modal";
import { RefundModal } from "./refund-modal";
import { ListPagination } from "@/components/admin/list-pagination";

export function TransactionsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") ?? "all");
  const [dateFilter, setDateFilter] = useState<DatePeriod>(
    (searchParams.get("period") as DatePeriod) ?? "all"
  );
  const [page, setPage] = useState(parseInt(searchParams.get("page") ?? "1", 10));

  const [viewingId, setViewingId] = useState<number | null>(null);
  const [refundTarget, setRefundTarget] = useState<TransactionItem | null>(null);

  const highlightRef = useRef<HTMLTableRowElement>(null);

  // URL-sync фильтров — shareable URLs.
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (dateFilter !== "all") params.set("period", dateFilter);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [search, statusFilter, typeFilter, dateFilter, page, router]);

  // Debounce поиска + сброс страницы при новом запросе.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching, isError, error, refetch } = useTransactionsList({
    q: debouncedSearch,
    status: statusFilter,
    type: typeFilter,
    period: dateFilter,
    page,
    per_page: PER_PAGE,
  });

  const items: TransactionItem[] = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;
  const stats = data?.stats;

  const isFirstLoad = isLoading && !data;
  const showEmpty = !isLoading && !isFetching && items.length === 0 && !isError;

  const isIdSearch = debouncedSearch !== "" && /^\d+$/.test(debouncedSearch);
  const searchedId = isIdSearch ? parseInt(debouncedSearch, 10) : null;

  // Авто-scroll к найденной по ID транзакции.
  useEffect(() => {
    if (highlightRef.current && searchedId) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [searchedId, items]);

  const syncMutation = useSyncTransaction();
  const refundMutation = useRefundTransaction();
  // Pending-стейт для спиннеров sync/refund. Спиннер крутится от клика
  // до WebSocket-события (а не до ответа POST, как раньше) — это даёт
  // админу понимание "процесс идёт" всё время, пока банк думает.
  const syncIds = useTransactionPending((s) => s.syncIds);
  const refundIds = useTransactionPending((s) => s.refundIds);

  const handleSetStatusFilter = (status: string) => {
    setStatusFilter(status);
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setDateFilter("all");
    setPage(1);
  };

  const hasFilters = search !== "" || statusFilter !== "all" || typeFilter !== "all" || dateFilter !== "all";

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Шапка */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Landmark className="w-6 h-6" />
              Финансы и транзакции
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              История платежей и списаний
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Обновить
          </Button>

          {/* Выручка */}
          <div className="bg-emerald-500/10 text-emerald-600 px-4 py-2 rounded-lg border border-emerald-500/20 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm">
              Выручка: <span className="font-bold">{stats?.revenue ?? "0.00"} ₽</span>
            </span>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-1">
            {PERIOD_OPTIONS.map((p) => (
              <Button
                key={p.value}
                variant={dateFilter === p.value ? "default" : "secondary"}
                size="sm"
                onClick={() => { setDateFilter(p.value); setSearch(""); setPage(1); }}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={typeFilter}
              onValueChange={(v: string | null) => {
                setTypeFilter(v ?? "all");
                setSearch("");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40 h-9">
                {TYPE_OPTIONS.find(o => o.value === typeFilter)?.label ?? "Тип"}
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <Input
                type="search"
                placeholder="ID, Email или ID от банка..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8"
              />
              {search && (
                <button
                  onClick={() => { setSearch(""); setDebouncedSearch(""); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Фильтр по статусу */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => {
            const count = stats
              ? (stats[f.value as keyof TransactionsStats] as number) ?? 0
              : undefined;
            return (
              <Button
                key={f.value}
                variant={statusFilter === f.value ? "default" : "secondary"}
                size="sm"
                onClick={() => handleSetStatusFilter(f.value)}
                className="gap-1.5"
              >
                {f.icon && <f.icon className={`w-4 h-4 ${f.iconColor}`} />}
                {f.label}
                <Badge variant="secondary" className="text-[10px] h-5 px-1">
                  {count ?? "—"}
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Таблица */}
      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <Table className="table-fixed w-full min-w-250">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-14">ID</TableHead>
              <TableHead className="w-50">Пользователь</TableHead>
              <TableHead className="w-30">Сумма</TableHead>
              <TableHead className="w-25">Тип</TableHead>
              <TableHead className="w-27.5">Статус</TableHead>
              <TableHead className="w-22.5">Провайдер</TableHead>
              <TableHead className="w-37.5">Дата</TableHead>
              <TableHead className="w-25 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isFirstLoad ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ) : isError ? (
              // F1: отдельная ветка ошибки загрузки (раньше показывало "не найдено")
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <AlertCircle className="w-16 h-16 text-destructive/50" />
                    <div>
                      <p className="text-sm font-medium text-destructive">
                        Не удалось загрузить транзакции
                      </p>
                      <p className="text-xs mt-1">
                        {extractErrorMessage(error, "Проверьте соединение с сервером")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetch()}
                      className="mt-2"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Повторить
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : showEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="h-64 text-center text-muted-foreground animate-in fade-in duration-300">
                  <div className="flex flex-col items-center gap-3">
                    <Landmark className="w-16 h-16 opacity-25" />
                    <p className="text-sm font-medium">Транзакций не найдено</p>
                    {hasFilters && (
                      <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-2">
                        Сбросить фильтры
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((tx, index) => {
                const isHighlighted = tx.id === searchedId;
                const rowClassName = [
                  "border-b border-border transition-colors",
                  isHighlighted ? "bg-blue-50 dark:bg-blue-950/40 " : "",
                ].filter(Boolean).join(" ");

                const amountSign = tx.status === "refunded" ? "-" : "";
     

                return (
                  <TableRow
                    key={tx.id}
                    ref={isHighlighted ? highlightRef : undefined}
                    className={`${rowClassName} animate-in fade-in slide-in-from-bottom-1 duration-300`}
                    style={{
                      animationDelay: `${Math.min(index * 15, 400)}ms`,
                      animationFillMode: "backwards",
                    }}
                  >
                    <TableCell className={`text-xs font-mono whitespace-nowrap tabular-nums align-top pt-3 ${isHighlighted ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      #{tx.id}
                    </TableCell>

                    <TableCell className="align-top pt-3">
                      {tx.user ? (
                        <button
                          onClick={() => router.push(`/users/${tx.user!.id}`)}
                          className="block text-left"
                        >
                          {/* F5: UserBadgeData импортируется из lib/types.
                              TransactionUser теперь = UserBadgeData, каст не нужен. */}
                          <UserBadge user={tx.user} size="sm" showEmail={true} />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Юзер удален</span>
                      )}
                    </TableCell>

                    <TableCell className={`text-sm whitespace-nowrap align-top pt-3 ${tx.amount_class}`}>
                      {amountSign}{tx.formatted_amount}
                    </TableCell>

                    <TableCell className="align-top pt-3">
                      <Badge
                        variant={tx.type_badge.variant as "default" | "secondary" | "destructive" | "warning" | "outline"}
                        className={tx.type_badge.className}
                      >
                        {tx.type_badge.label}
                      </Badge>
                    </TableCell>

                    <TableCell className="align-top pt-3">
                      <Badge variant={tx.status_badge.variant as "default" | "secondary" | "destructive" | "warning" | "success"}>
                        {tx.status_badge.label}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground uppercase align-top pt-3">
                      {tx.provider ?? "—"}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap align-top pt-3">
                      {/* F6: используем formatDateTime из lib/format, не локальный */}
                      {tx.created_at && formatDateTime(tx.created_at)}
                      {tx.updated_at && tx.updated_at !== tx.created_at && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">
                          ↻ {formatDateTime(tx.updated_at)}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-right align-top pt-3">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setViewingId(tx.id)}
                          title="Посмотреть детали"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {tx.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => syncMutation.mutate(tx.id)}
                            // Спиннер крутится пока syncIds.has(tx.id) —
                            // от клика до WebSocket .sync.processed.
                            // Раньше было isThisRowSyncing (только пока POST не ответил).
                            disabled={syncIds.has(tx.id)}
                            title="Проверить в банке"
                          >
                            {syncIds.has(tx.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                            ) : (
                              <RefreshCw className="w-4 h-4 text-blue-500" />
                            )}
                          </Button>
                        )}

                        {tx.status === "success" && tx.type !== "refund" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setRefundTarget(tx)}
                            // Пока возврат в процессе (Job идёт в банк) —
                            // показываем спиннер и блокируем повторный клик.
                            disabled={refundIds.has(tx.id)}
                            title={refundIds.has(tx.id) ? "Возврат в обработке..." : "Оформить возврат"}
                          >
                            {refundIds.has(tx.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin text-destructive" />
                            ) : (
                              <Undo2 className="w-4 h-4 text-destructive" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ListPagination
        currentPage={page}
        lastPage={meta?.last_page ?? 1}
        from={meta?.from ?? null}
        to={meta?.to ?? null}
        total={meta?.total}
        onChangePage={setPage}
        disabled={isFetching}
      />

      {/* Модалка деталей — вынесена в отдельный файл */}
      <TransactionDetailModal
        transactionId={viewingId}
        onClose={() => setViewingId(null)}
      />

      {/* Модалка возврата — вынесена в отдельный файл */}
      <RefundModal
        transaction={refundTarget}
        onOpenChange={(open) => { if (!open) setRefundTarget(null); }}
        isLoading={refundMutation.isPending}
        onConfirm={(reason, comment) => {
          if (!refundTarget) return;
          // F7: onSuccess вместо onSettled — модалка закрывается только при успехе.
          // При ошибке остаётся открытой, чтобы админ видел сообщение и мог повторить.
          refundMutation.mutate(
            { id: refundTarget.id, reason, comment },
            {
              onSuccess: () => setRefundTarget(null),
            }
          );
        }}
      />
    </div>
  );
}

