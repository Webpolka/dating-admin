// app/(admin)/system/broadcasts/_components/broadcasts-table-client.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useBroadcastsList,
  useDeleteBroadcast,
  useDuplicateBroadcast,
  useSendBroadcastNow,
  useBulkDeleteBroadcasts,
  type BroadcastItem,
} from "@/hooks/admin/use-broadcasts";
import { extractErrorMessage } from "@/lib/api";
import { getInitialUrlParam } from "@/lib/url-params";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { UserBadge } from "@/components/admin/user-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  ArrowLeft, Radio, Plus, Search, X, RotateCcw, Loader2,
  CalendarIcon, AlertCircle, Trash2
} from "lucide-react";
import { formatDate, formatTime } from "@/lib/format";
import {
  SEARCH_DEBOUNCE_MS, PER_PAGE, STATUS_FILTERS, TYPE_ICONS, TYPE_LABELS,
} from "./_shared";
import { BroadcastStatusBadge } from "./broadcast-status-badge";
import { BroadcastRowActions } from "./broadcast-row-actions";
import { ListPagination } from "@/components/admin/list-pagination";

export function BroadcastsTableClient() {
  const router = useRouter();

  // F2: initial state через getInitialUrlParam (после mount) — предотвращает
  // hydration mismatch и устаревший snapshot useSearchParams.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BroadcastItem | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // F8: per-row pending для sendNow. Set<id> — чтобы независимо блокировать
  // dropdown для конкретной рассылки, а не глобально.
  const [sendingIds, setSendingIds] = useState<Set<number>>(new Set());

  const [urlInitialized, setUrlInitialized] = useState(false);
  const highlightRowRef = useRef<HTMLTableRowElement>(null);

  // Initial URL read (после mount).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(getInitialUrlParam("q"));
    setDebouncedSearch(getInitialUrlParam("q"));
    setStatusFilter(getInitialUrlParam("status") || "all");
    setTypeFilter(getInitialUrlParam("type") || "all");
    setDateFrom(getInitialUrlParam("date_from"));
    setDateTo(getInitialUrlParam("date_to"));
    setPage(parseInt(getInitialUrlParam("page") || "1", 10));
    setUrlInitialized(true);
  }, []);

  // URL-sync.
  useEffect(() => {
    if (!urlInitialized) return;
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [search, statusFilter, typeFilter, dateFrom, dateTo, page, router, urlInitialized]);

  // F4: debounce 400ms.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);

      // Если ввели ID — сбрасываем все фильтры, чтобы найти рассылку в любом статусе
      if (search && /^\d+$/.test(search)) {
        setStatusFilter("all");
        setTypeFilter("all");
        setDateFrom("");
        setDateTo("");
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching, isError, error, refetch } = useBroadcastsList({
    q: debouncedSearch,
    status: statusFilter,
    type: typeFilter,
    date_from: dateFrom,
    date_to: dateTo,
    page,
    per_page: PER_PAGE,
  });

  const deleteMutation = useDeleteBroadcast();
  const duplicateMutation = useDuplicateBroadcast();
  const sendNowMutation = useSendBroadcastNow();
  const bulkDeleteMutation = useBulkDeleteBroadcasts();

  const items: BroadcastItem[] = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;
  const counts = data?.counts;

  const isHighlightedId = debouncedSearch !== "" && /^\d+$/.test(debouncedSearch)
    ? parseInt(debouncedSearch, 10)
    : null;

  useEffect(() => {
    if (highlightRowRef.current && isHighlightedId) {
      highlightRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlightedId, items]);

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const hasFilters = search !== "" || statusFilter !== "all" || typeFilter !== "all" || dateFrom !== "" || dateTo !== "";

  const isFirstLoad = isLoading && !data;
  const showEmpty = !isLoading && !isFetching && items.length === 0 && !isError;

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelected(checked ? items.map((b) => String(b.id)) : []);
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    setSelected((prev) =>
      checked ? [...prev, String(id)] : prev.filter((s) => s !== String(id))
    );
  };

  const handleClearSelection = () => {
    setSelected([]);
    setSelectAll(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const handleDuplicate = (broadcast: BroadcastItem) => {
    duplicateMutation.mutate(broadcast.id, {
      onSuccess: (data) => {
        if (data?.data?.id) {
          router.push(`/system/broadcasts/${data.data.id}/edit`);
        }
      },
    });
  };

  // F8: per-row pending для sendNow.
  const handleSendNow = (broadcast: BroadcastItem) => {
    setSendingIds((prev) => {
      const next = new Set(prev);
      next.add(broadcast.id);
      return next;
    });
    sendNowMutation.mutate(broadcast.id, {
      onSettled: () => {
        setSendingIds((prev) => {
          const next = new Set(prev);
          next.delete(broadcast.id);
          return next;
        });
      },
    });
  };

  const handleBulkDelete = () => {
    if (selected.length === 0) return;
    bulkDeleteMutation.mutate(selected.map((s) => parseInt(s, 10)), {
      onSuccess: () => {
        setBulkDeleteOpen(false);
        handleClearSelection();
      },
    });
  };

    // ============================================
  // ДИАПАЗОН ДАТ (date_from / date_to)
  // ============================================
  // Принцип: "по" всегда >= "с". Если юзер выбрал инвертированный
  // диапазон — автоматически подтягиваем вторую границу.
  
  const handleDateFromChange = (dateStr: string) => {
    setDateFrom(dateStr);
    // Если "с" > "по" — подтягиваем "по" к "с".
    if (dateStr && dateTo && dateStr > dateTo) {
      setDateTo(dateStr);
    }
    setSearch("");
    setPage(1);
  };

  const handleDateToChange = (dateStr: string) => {
    // Если "по" < "с" — подтягиваем "по" к "с".
    if (dateStr && dateFrom && dateStr < dateFrom) {
      setDateTo(dateFrom);
    } else {
      setDateTo(dateStr);
    }
    setSearch("");
    setPage(1);
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Radio className="w-6 h-6" />
              Рассылка уведомлений
              {counts && counts.draft > 0 && (
                <Badge variant="warning">{counts.draft} черновиков</Badge>
              )}
            </h1>
          </div>
        </div>

        <Button onClick={() => router.push("/system/broadcasts/new")}>
          <Plus className="w-4 h-4" />
          Создать рассылку
        </Button>
      </div>

      {/* Filters + Bulk actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {selected.length > 0 ? (
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)} className="gap-2">
            <Trash2 className="w-4 h-4" />
            Удалить выбранные
            <Badge variant="warning">{selected.length}</Badge>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled className="gap-2 opacity-50">
            <Trash2 className="w-4 h-4" /> Не выбрано
          </Button>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleResetFilters} disabled={!hasFilters} className="gap-1.5">
            <RotateCcw className="w-4 h-4" />
            Сбросить
          </Button>

          <Select
            value={typeFilter}
            onValueChange={(v: string | null) => { setTypeFilter(v ?? "all"); setSearch(""); setPage(1); }}
          >
            <SelectTrigger className="w-32 h-9">
              {typeFilter === "all" ? "Все типы" : TYPE_LABELS[typeFilter] ?? typeFilter}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="in_app">В приложении</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="push">Push</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger render={
              <Button variant="outline" size="sm" className="w-40 justify-between font-normal">
                {dateFrom ? format(new Date(dateFrom), "dd.MM.yyyy") : <span className="text-muted-foreground">С даты</span>}
                <CalendarIcon className="w-4 h-4 opacity-50" />
              </Button>
            } />
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom ? new Date(dateFrom) : undefined}
                onSelect={(d) => handleDateFromChange(d ? format(d, "yyyy-MM-dd") : "")}
              />
            </PopoverContent>
          </Popover>

          <span>-</span>

          <Popover>
            <PopoverTrigger render={
              <Button variant="outline" size="sm" className="w-40 justify-between font-normal">
                {dateTo ? format(new Date(dateTo), "dd.MM.yyyy") : <span className="text-muted-foreground">По дату</span>}
                <CalendarIcon className="w-4 h-4 opacity-50" />
              </Button>
            } />
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo ? new Date(dateTo) : undefined}
                onSelect={(d) => handleDateToChange(d ? format(d, "yyyy-MM-dd") : "")}
              />
            </PopoverContent>
          </Popover>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Поиск по ID или тексту..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status filter buttons */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => {
          const count = counts ? (f.value === "all" ? counts.total : counts[f.value as keyof typeof counts] ?? 0) : undefined;
          return (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleStatusFilterChange(f.value)}
              className="gap-1.5"
            >
              <span>{f.label}</span>
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-medium tabular-nums rounded-sm bg-background/40">
                {count ?? "—"}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden bg-card relative">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-8">
                <Checkbox checked={selectAll} onCheckedChange={(c) => handleSelectAll(Boolean(c))} />
              </TableHead>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>Рассылка</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Аудитория</TableHead>
              <TableHead className="w-28">Статус</TableHead>
              <TableHead>Автор</TableHead>
              <TableHead>Создано</TableHead>
              <TableHead>Отправлено</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isFirstLoad ? (
              <TableRow>
                <TableCell colSpan={10} className="py-16">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ) : isError ? (
              // F5: отдельная ветка ошибки загрузки.
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={10} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle className="w-16 h-16 text-destructive/50" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Не удалось загрузить рассылки</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {extractErrorMessage(error, "Проверьте соединение с сервером")}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Повторить
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : showEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={10} className="h-64 text-center text-muted-foreground animate-in fade-in duration-300">
                  <div className="flex flex-col items-center gap-3">
                    <Radio className="w-16 h-16 opacity-25" />
                    <p className="text-sm font-medium">Нет рассылок</p>
                    {hasFilters && (
                      <Button variant="outline" size="sm" onClick={handleResetFilters}>
                        Сбросить фильтры
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((broadcast, index) => {
                const isHighlighted = broadcast.id === isHighlightedId;
                const isSelected = selected.includes(String(broadcast.id));
                const rowClassName = [
                  "border-b border-border transition-colors",
                  isHighlighted ? "bg-blue-50 dark:bg-blue-950/40 " : "",
                  !isHighlighted && isSelected ? "bg-muted/30" : "",
                ].filter(Boolean).join(" ");

                const TypeIcon = TYPE_ICONS[broadcast.type] || Radio;

                return (
                  <TableRow
                    key={broadcast.id}
                    ref={isHighlighted ? highlightRowRef : undefined}
                    className={`${rowClassName} animate-in fade-in slide-in-from-bottom-1 duration-300`}
                    style={{
                      animationDelay: `${Math.min(index * 20, 400)}ms`,
                      animationFillMode: "backwards",
                    }}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(c) => handleSelectOne(broadcast.id, Boolean(c))}
                      />
                    </TableCell>
                    <TableCell className={`text-xs font-mono whitespace-nowrap tabular-nums ${isHighlighted ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      #{broadcast.id}
                    </TableCell>
                    <TableCell className="max-w-[18rem] align-top">
                      <button
                        onClick={() => router.push(`/system/broadcasts/${broadcast.id}/edit`)}
                        className="block text-left group cursor-pointer w-full"
                      >
                        <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {broadcast.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {broadcast.message}
                        </div>
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <TypeIcon className="w-3 h-3" />
                        {TYPE_LABELS[broadcast.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-42">
                      {broadcast.target_user ? (
                        // F7: убран non-null assertion — broadcast.target_user уже проверен
                        <button
                          onClick={() => router.push(`/admin/users/${broadcast.target_user!.id}`)}
                          className="block text-left"
                        >
                          <UserBadge user={broadcast.target_user} />
                        </button>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {broadcast.audience_parts.length > 0 ? (
                            broadcast.audience_parts.map((part, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] whitespace-nowrap">
                                {part}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">Все пользователи</Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <BroadcastStatusBadge broadcast={broadcast} />
                    </TableCell>
                    <TableCell>
                      {broadcast.admin ? (
                        <button
                          onClick={() => router.push(`/admin/users/${broadcast.admin!.id}`)}
                          className="block text-left"
                        >
                          <UserBadge user={broadcast.admin} showEmail={false} />
                        </button>
                      ) : (
                        <Badge variant="secondary">Система</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      <div>{formatDate(broadcast.created_at)}</div>
                      <div className="text-[10px] opacity-70">{formatTime(broadcast.created_at)}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                      {broadcast.sent_at ? (
                        <>
                          <div>{formatDate(broadcast.sent_at)}</div>
                          <div className="text-[10px] opacity-70">{formatTime(broadcast.sent_at)}</div>
                        </>
                      ) : broadcast.started_at ? (
                        <>
                          <div>{formatDate(broadcast.started_at)}</div>
                          <div className="text-[10px] opacity-70">{formatTime(broadcast.started_at)}</div>
                        </>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <BroadcastRowActions
                        broadcast={broadcast}
                        isSending={sendingIds.has(broadcast.id)}
                        onEdit={() => router.push(`/system/broadcasts/${broadcast.id}/edit`)}
                        onSendNow={() => handleSendNow(broadcast)}
                        onDuplicate={() => handleDuplicate(broadcast)}
                        onDelete={() => setDeleteTarget(broadcast)}
                      />
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

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Удалить рассылку?"
        description={deleteTarget ? `Рассылка «${deleteTarget.title}» будет удалена без возможности восстановления.` : undefined}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Удалить выбранные рассылки?"
        description={`Будут удалены ${selected.length} рассылок. Рассылки в процессе отправки удалены не будут. Это действие нельзя отменить.`}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="destructive"
        isLoading={bulkDeleteMutation.isPending}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}

