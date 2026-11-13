// app/(admin)/security/fraud-alerts/_components/fraud-alerts-table-client.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useFraudAlertsList,
  useFraudCounts,
  useResolveAndBan,
  useResolveWithWarning,
  useMarkAsFalsePositive,
  type FraudAlertItem,
} from "@/hooks/admin/use-fraud-alerts";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { UserBadge } from "@/components/admin/user-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Siren, Search, X, Loader2, MoreHorizontal,
  EyeOff, Clock, Gavel, AlertTriangle, ShieldCheck, ChevronDown, UserCheck, Flame,
} from "lucide-react";
import { formatDate, formatTime } from "@/lib/format";
import { STATUS_FILTERS, SEVERITY_OPTIONS, DEFAULT_STATUS, DEFAULT_SEVERITY, PER_PAGE, SEARCH_DEBOUNCE_MS } from "./fraud-alerts-shared";
import { ListPagination } from "@/components/admin/list-pagination";

export function FraudAlertsTableClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? DEFAULT_STATUS);
  const [severityFilter, setSeverityFilter] = useState(searchParams.get("severity") ?? DEFAULT_SEVERITY);
  const [page, setPage] = useState(parseInt(searchParams.get("page") ?? "1", 10));

  const [confirmAction, setConfirmAction] = useState<{ type: "ban" | "warning" | "false_positive"; alertId: number; banType?: string } | null>(null);
  // Управляемый аккордеон: храним id открытой строки (null = все закрыты)
  // Без <details> — чистый React-state, чтобы CSS Grid-анимация не конфликтовала с нативным поведением браузера
  const [openEvidenceId, setOpenEvidenceId] = useState<number | null>(null);

  const highlightRowRef = useRef<HTMLTableRowElement>(null);

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter !== DEFAULT_STATUS) params.set("status", statusFilter);
    if (severityFilter !== DEFAULT_SEVERITY) params.set("severity", severityFilter);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [search, statusFilter, severityFilter, page, router]);

  // Поиск: debounce + сброс фильтров/page ВНУТРИ timer.
  //
  // ВАЖНО: все четыре state-обновления (debouncedSearch + page + statusFilter
  // + severityFilter) должны сработать атомарно — внутри одного setTimeout tick.
  //
  // Если разнести их (мгновенно status/severity/page, в timer — debouncedSearch),
  // получится два queryKey change подряд:
  //   1) {q: старый, status: all, severity: all, page: 1} — React Query кидает
  //      запрос с ПРОМЕЖУТОЧНЫМ невалидным состоянием (расширенные фильтры +
  //      старый поиск)
  //   2) {q: новый, status: all, severity: all, page: 1} — финальный запрос
  // Между ними (≈400ms) таблица показывает результаты первого (невалидного)
  // запроса → мелькание «сначала все, потом нужное».
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      // Поиск по ID: искомый алерт может быть в любом статусе/severity,
      // сбрасываем фильтры, чтобы он точно попал в выдачу.
      if (search !== "" && /^\d+$/.test(search)) {
        setStatusFilter("all");
        setSeverityFilter("all");
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching } = useFraudAlertsList({
    q: debouncedSearch,
    status: statusFilter,
    severity: severityFilter,
    page,
    per_page: PER_PAGE,
  });

  // Counts — из отдельного stable query (не зависит от filter/search/page).
  // Раньше брали из data?.counts — скачкообразный UI при смене вкладок.
  const { data: countsData } = useFraudCounts();
  const counts = countsData?.stats;

  const banMutation = useResolveAndBan();
  const warningMutation = useResolveWithWarning();
  const falsePositiveMutation = useMarkAsFalsePositive();

  const items: FraudAlertItem[] = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;

  const isHighlightedId = debouncedSearch !== "" && /^\d+$/.test(debouncedSearch)
    ? parseInt(debouncedSearch, 10)
    : null;

  useEffect(() => {
    if (highlightRowRef.current && isHighlightedId) {
      highlightRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlightedId, items]);

  // Сбрасываем открытый аккордеон при смене фильтров/страницы — чтобы не было зависших раскрытых строк
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenEvidenceId(null);
  }, [debouncedSearch, statusFilter, severityFilter, page]);

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter(DEFAULT_STATUS);
    setSeverityFilter(DEFAULT_SEVERITY);
    setPage(1);
  };

  const hasFilters = search !== "" || statusFilter !== DEFAULT_STATUS || severityFilter !== DEFAULT_SEVERITY;

  const isFirstLoad = isLoading && !data;
  const showEmpty = !isLoading && !isFetching && items.length === 0;

  const handleConfirm = () => {
    if (!confirmAction) return;

    if (confirmAction.type === "ban") {
      banMutation.mutate({ id: confirmAction.alertId, type: confirmAction.banType || "permanent" });
    } else if (confirmAction.type === "warning") {
      warningMutation.mutate(confirmAction.alertId);
    } else if (confirmAction.type === "false_positive") {
      falsePositiveMutation.mutate(confirmAction.alertId);
    }

    setConfirmAction(null);
  };

  const isMutating = banMutation.isPending || warningMutation.isPending || falsePositiveMutation.isPending;

  const toggleEvidence = (alertId: number) => {
    setOpenEvidenceId((prev) => (prev === alertId ? null : alertId));
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Siren className="w-6 h-6 text-destructive" />
              Антифрод-мониторинг
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-destructive" />
              Высокий приоритет:
              <span className="text-destructive font-bold tabular-nums">{counts?.high_priority ?? 0}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 items-center">
          {STATUS_FILTERS.map((f) => {
            const count = counts
              ? (f.value === "all" ? counts.total : counts[f.value as keyof typeof counts])
              : undefined;
            const Icon = f.icon;
            return (
              <Button
                key={f.value}
                variant={statusFilter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => { setStatusFilter(f.value); setSearch(""); setPage(1); }}
                className="gap-1.5"
              >
                <Icon className={`w-4 h-4 ${f.iconColor}`} />
                <span>{f.label}</span>
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-medium tabular-nums rounded-sm bg-background/40">
                  {count ?? "—"}
                </span>
              </Button>
            );
          })}
       
        </div>

        {/* Поиск + кнопка «Сбросить» рядом — интуитивнее, чем в блоке с табами */}
        <div className="flex items-center gap-2">
            {hasFilters && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-muted-foreground">
              <X className="w-4 h-4" /> Сбросить
            </Button>
          )}

             <div className="mx-2 h-6 border-l border-border"></div>

          <Select
            value={severityFilter}
            onValueChange={(v: string | null) => { setSeverityFilter((v ?? DEFAULT_SEVERITY) as typeof severityFilter); setPage(1); }}
          >
            <SelectTrigger className="w-50 h-9">
              {SEVERITY_OPTIONS.find(s => s.value === severityFilter)?.label ?? "Опасность"}
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Поиск по имени, email или id..."
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

      {/* overflow-x-auto: на узких экранах таблица скроллится по горизонтали, а не жмётся в гармошку */}
      <div className="rounded-md border border-border bg-card overflow-x-auto">
        {/*
          table-fixed: ширины берутся из <th>, контент не двигает соседние колонки.
          min-w-[760px]: фикс. колонки суммарно ~590px, на Триггер остаётся минимум 170px.
          На вьюпортах ≥760px таблица растягивается на 100% и Триггер забирает весь остаток.
        */}
        <Table className="table-fixed w-full min-w-150">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 min-w-220">
              <TableHead className="w-10">ID</TableHead>
              <TableHead className="w-40">Кто нарушил</TableHead>
              <TableHead className="w-100">Триггер</TableHead>
              <TableHead className="w-20">Опасность</TableHead>
              <TableHead className="w-20">Статус</TableHead>
              <TableHead className="w-20">Дата</TableHead>
              <TableHead className="w-20 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isFirstLoad ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ) : showEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-64 text-center text-muted-foreground animate-in fade-in duration-300">
                  <div className="flex flex-col items-center gap-3">
                    <ShieldCheck className="w-16 h-16 opacity-25" />
                    <p className="text-sm font-medium">Открытых алертов нет. Можно отдохнуть!</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((alert, index) => {
                const isHighlighted = alert.id === isHighlightedId;
                const isOpen = alert.is_open;
                const hasMeta = alert.meta && Object.keys(alert.meta as Record<string, unknown>).length > 0;
                const isEvidenceOpen = openEvidenceId === alert.id;

                const rowClassName = [
                  "border-b border-border transition-colors",
                  isHighlighted ? "bg-blue-50 dark:bg-blue-950/40 " : "",
                  !isHighlighted && isOpen && alert.severity === "high" ? "bg-destructive/5" : "",
                ].filter(Boolean).join(" ");

                return (
                  <TableRow
                    key={alert.id}
                    ref={isHighlighted ? highlightRowRef : undefined}
                    className={`${rowClassName} animate-in fade-in slide-in-from-bottom-1 duration-300`}
                    style={{
                      animationDelay: `${Math.min(index * 20, 400)}ms`,
                      animationFillMode: "backwards",
                    }}
                  >
                    <TableCell className={`text-xs font-mono whitespace-nowrap tabular-nums align-top pt-3 ${isHighlighted ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      #{alert.id}
                    </TableCell>

                    <TableCell className="align-top pt-3">
                      {alert.user ? (
                        <button onClick={() => router.push(`/admin/users/${alert.user!.id}`)} className="block text-left">
                          <UserBadge user={alert.user} />
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-medium">
                            D
                          </div>
                          <span className="text-sm text-muted-foreground italic">Аккаунт удален</span>
                        </div>
                      )}
                    </TableCell>

                    {/* Колонка «Триггер»: лейбл + бейдж + «Улики» в одну строку, ниже — плавный Grid-аккордеон */}
                    <TableCell className="align-top pt-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="font-medium text-sm text-foreground truncate"
                            title={alert.trigger_label}
                          >
                            {alert.trigger_label}
                          </span>
                          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-sm shrink-0 ${alert.trigger_color}`}>
                            {alert.trigger_type}
                          </span>
                        </div>
                        {hasMeta && (
                          <button
                            type="button"
                            onClick={() => toggleEvidence(alert.id)}
                            className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-1"
                            aria-expanded={isEvidenceOpen}
                          >
                            <span>Улики</span>
                            <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isEvidenceOpen ? "rotate-180" : ""}`} />
                          </button>
                        )}
                      </div>

                      {/* Плавный CSS-аккордеон на React-стейте: grid-rows 0fr → 1fr интерполируется браузером */}
                      {hasMeta && (
                        <div
                          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                            isEvidenceOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className="mt-2 p-3 bg-muted/30 rounded-md border border-border text-xs space-y-1 max-h-70 overflow-y-auto">
                              {Object.entries(alert.meta as Record<string, unknown>).map(([key, val]) => (
                                <div key={key} className="flex gap-2">
                                  <span className="font-mono text-muted-foreground shrink-0">{key}:</span>
                                  <span className="text-foreground font-medium wrap-break-words">
                                    {Array.isArray(val) ? val.join(", ") : String(val)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="align-top pt-3">
                      <Badge variant={alert.severity_variant as "default" | "secondary" | "destructive" | "warning"}>
                        {alert.severity_label}
                      </Badge>
                    </TableCell>

                    <TableCell className="align-top pt-3">
                      <div className="flex flex-col gap-0.5">
                        <Badge variant={alert.status_variant as "default" | "secondary" | "destructive" | "warning" | "success"}>
                          {alert.status_label}
                        </Badge>
                        {alert.admin && (
                          <span className="text-[10px] text-muted-foreground mt-1 truncate" title={alert.admin.name}>
                            {alert.admin.name}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap tabular-nums align-top pt-3">
                      <div>{formatDate(alert.created_at)}</div>
                      <div className="text-[10px] opacity-70">{formatTime(alert.created_at)}</div>
                    </TableCell>

                    <TableCell className="text-right align-top pt-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        {/* min-w-64 = 256px (было min-w-42 = 168px), в 1.5 раза шире */}
                        <DropdownMenuContent align="end" className="min-w-64">
                          <DropdownMenuGroup>
                            {isOpen ? (
                              <>
                                <DropdownMenuLabel>Выберите наказание</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {alert.user ? (
                                  <>
                                    <DropdownMenuItem onClick={() => setConfirmAction({ type: "ban", alertId: alert.id, banType: "shadow" })}>
                                      <EyeOff className="w-4 h-4 text-purple-500" /> Теневой бан
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setConfirmAction({ type: "ban", alertId: alert.id, banType: "temp" })}>
                                      <Clock className="w-4 h-4 text-yellow-500" /> Бан на 3 дня
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setConfirmAction({ type: "ban", alertId: alert.id, banType: "permanent" })}>
                                      <Gavel className="w-4 h-4 text-red-500" /> Вечный бан
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setConfirmAction({ type: "warning", alertId: alert.id })}>
                                      <AlertTriangle className="w-4 h-4 text-yellow-500" /> Предупредить в чате
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <DropdownMenuItem onClick={() => setConfirmAction({ type: "ban", alertId: alert.id, banType: "permanent" })}>
                                    <ShieldCheck className="w-4 h-4 text-green-500" /> Закрыть алерт
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setConfirmAction({ type: "false_positive", alertId: alert.id })}>
                                  <ShieldCheck className="w-4 h-4 text-green-500" /> Отметить как ложняк
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuLabel>Алерт закрыт</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {alert.admin && (
                                  <DropdownMenuItem disabled>
                                    <UserCheck className="w-4 h-4" /> Разобрал: {alert.admin.name}
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title="Подтвердите действие"
        description="Вы уверены, что хотите применить это действие к алерту?"
        confirmText="Применить"
        cancelText="Отмена"
        variant={confirmAction?.type === "ban" ? "destructive" : "default"}
        isLoading={isMutating}
        onConfirm={handleConfirm}
      />
    </div>
  );
}