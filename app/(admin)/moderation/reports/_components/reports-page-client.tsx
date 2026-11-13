// app/(admin)/moderation/reports/_components/reports-page-client.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  useReportsList,
  useReportCounts,
  type ReportItem,
} from "@/hooks/admin/use-reports";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import {
  Table, TableBody, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShieldAlert, X } from "lucide-react";

import { ReportRow } from "./report-row";
import { STATUS_TABS, SEARCH_DEBOUNCE_MS } from "./reports-shared";
import { ListPagination } from "@/components/admin/list-pagination";
import { NewCountBadge, PageHeader } from "@/components/admin/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { StatusTabs } from "@/components/admin/status-tabs";
import { TableEmptyRow, TableLoadingRow } from "@/components/admin/table-states";

const TYPE_OPTIONS = [
  { value: "all", label: "Все типы" },
  { value: "user", label: "На пользователя" },
  { value: "photo", label: "На фото" },
];

export function ReportsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get("status") ?? "pending"
  );
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") ?? "all");
  const [page, setPage] = useState(parseInt(searchParams.get("page") ?? "1", 10));

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter !== "pending") params.set("status", statusFilter);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [search, statusFilter, typeFilter, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Поиск: debounce + моментальный сброс фильтров на "all".
  // При вводе текста → сразу переключаемся на "Все" статус + "Все типы"
  // (искомый ID/имя может быть в любом статусе — pending/resolved/rejected).
  // Сброс идёт НЕ внутри debounce timer → нет задержки 1 сек.
  useEffect(() => {
    if (search !== "") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatusFilter("all");
      setTypeFilter("all");
    }
    setPage(1);
    const t = setTimeout(() => {
      setDebouncedSearch(search);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching, refetch } = useReportsList({
    status: statusFilter as "all" | "pending" | "resolved" | "rejected",
    type: typeFilter,
    q: debouncedSearch,
    page,
  });

  const items = useMemo(() => (data?.data ?? []) as ReportItem[], [data]);
  const meta = data?.meta;
  // Counts — из отдельного stable query (не зависит от filter/search/page).
  // Раньше брали из data?.stats — скачкообразный UI при смене вкладок.
  const { data: countsData } = useReportCounts();
  const stats = countsData?.stats;

  const isFirstLoad = isLoading && !data;
  const showEmpty = !isLoading && !isFetching && items.length === 0;

  const isIdSearch = debouncedSearch !== "" && /^\d+$/.test(debouncedSearch);
  const searchedId = isIdSearch ? parseInt(debouncedSearch, 10) : null;

  const handleSetStatus = (status: string) => {
    setStatusFilter(status);
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const handleSetTypeFilter = (type: string) => {
    setTypeFilter(type);
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("pending");
    setTypeFilter("all");
    setPage(1);
  };

  const hasFilters = search !== "" || statusFilter !== "pending" || typeFilter !== "all";
  const pendingTotal = stats?.pending ?? 0;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Шапка */}
      <PageHeader
        icon={ShieldAlert}
        title="Жалобы и поддержка"
        badge={<NewCountBadge count={pendingTotal} />}
        description={`Всего: ${stats?.total ?? 0} (В очереди: ${stats?.pending ?? 0})}`}
        onBack={() => router.back()}
        onRefresh={refetch}
        isFetching={isFetching}
      />

      {/* Табы + Фильтр типа + Поиск */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <StatusTabs
            tabs={STATUS_TABS}
            value={statusFilter as "all" | "pending" | "resolved" | "rejected"}
            onChange={handleSetStatus}
            getCount={(v) =>
              v === "all" ? stats?.total : (stats as Record<string, number>)?.[v]
            }
          />

          <div className="flex items-center gap-2 ml-auto">
            <Select
              value={typeFilter}
              onValueChange={(v: string | null) => handleSetTypeFilter(v ?? "all")}
            >
              <SelectTrigger className="w-40 h-9">
                {TYPE_OPTIONS.find(o => o.value === typeFilter)?.label ?? "Тип жалобы"}
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="ID, имя, email или причина..."
            />

            {hasFilters && (
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                <X className="w-4 h-4 mr-1" />
                Сбросить
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Таблица */}
      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <Table className="table-fixed w-full min-w-220">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-16">ID</TableHead>
              <TableHead className="w-50">Жалобщик</TableHead>
              <TableHead className="w-50">Объект жалобы</TableHead>
              <TableHead>Причина</TableHead>
              <TableHead className="w-25">Статус</TableHead>
              <TableHead className="w-30">Дата</TableHead>
              <TableHead className="w-22 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isFirstLoad ? (
              <TableLoadingRow colSpan={7} />
            ) : showEmpty ? (
              <TableEmptyRow
                colSpan={7}
                title="Нет жалоб"
                onResetFilters={hasFilters ? handleResetFilters : undefined}
              />
            ) : (
              items.map((report, index) => (
                <ReportRow
                  key={report.id}
                  report={report}
                  isHighlighted={report.id === searchedId}
                  index={index}
                />
              ))
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
    </div>
  );
}
