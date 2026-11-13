// app/(admin)/system/geoip/_components/geoip-locations-table-client.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useGeoLocationsList,
  useGeoLocationsCounts,
  useToggleGeoRegistration,
  useToggleGeoFeed,
  type GeoType,
  type GeoLocationItem,
} from "@/hooks/admin/use-geoip-locations";
import { extractErrorMessage } from "@/lib/api";
import { getInitialUrlParam } from "@/lib/url-params";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Globe, ArrowLeft, Search, X, FilterX, Loader2, AlertCircle } from "lucide-react";
import { SEARCH_DEBOUNCE_MS, PER_PAGE, TYPE_FILTERS, TYPE_LABELS } from "./_shared";
import { ListPagination } from "@/components/admin/list-pagination";

export function GeoIpLocationsTableClient({ backUrl }: { backUrl: string }) {
  const router = useRouter();

  // F2: initial state через getInitialUrlParam (после mount) — предотвращает
  // hydration mismatch и устаревший snapshot useSearchParams.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<GeoType>("country");
  const [page, setPage] = useState(1);
  const [blockedFilter, setBlockedFilter] = useState<'none' | 'reg' | 'feed'>('none');

  const [urlInitialized, setUrlInitialized] = useState(false);
  const highlightRowRef = useRef<HTMLTableRowElement>(null);

  // Initial URL read (после mount).
  useEffect(() => {
           // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(getInitialUrlParam("q"));
    setDebouncedSearch(getInitialUrlParam("q"));
    const urlType = getInitialUrlParam("type") as GeoType;
    if (urlType && ["country", "region", "city"].includes(urlType)) setTypeFilter(urlType);
    setPage(parseInt(getInitialUrlParam("page") || "1", 10));
    const urlBlocked = getInitialUrlParam("blocked") as 'none' | 'reg' | 'feed';
    if (urlBlocked && ["none", "reg", "feed"].includes(urlBlocked)) setBlockedFilter(urlBlocked);
    setUrlInitialized(true);
  }, []);

  // URL-sync.
  useEffect(() => {
    if (!urlInitialized) return;
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (typeFilter !== "country") params.set("type", typeFilter);
    if (page > 1) params.set("page", String(page));
    if (blockedFilter !== 'none') params.set("blocked", blockedFilter);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [search, typeFilter, page, blockedFilter, router, urlInitialized]);

  // F4: debounce 400ms.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const { data: countsData } = useGeoLocationsCounts();
  const counts = countsData?.data;

  const { data, isLoading, isFetching, isError, error, refetch } = useGeoLocationsList({
    type: typeFilter,
    q: debouncedSearch,
    page,
    per_page: PER_PAGE,
    blocked: blockedFilter,
  });

  // При поиске ID — backend вернёт фактический type найденной локации,
  // синхронизируем таб (только при активном поиске по ID)
  useEffect(() => {
    if (!data?.type) return;
    const isIdSearch = debouncedSearch !== "" && /^\d+$/.test(debouncedSearch);
    if (isIdSearch && data.type !== typeFilter) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTypeFilter(data.type);
    }
  }, [data?.type, typeFilter, debouncedSearch]);

  const toggleRegMutation = useToggleGeoRegistration();
  const toggleFeedMutation = useToggleGeoFeed();

  const items: GeoLocationItem[] = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;

  const isHighlightedId = debouncedSearch !== "" && /^\d+$/.test(debouncedSearch)
    ? parseInt(debouncedSearch, 10)
    : null;

  useEffect(() => {
    if (highlightRowRef.current && isHighlightedId) {
      highlightRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlightedId, items]);

  const handleTypeFilterChange = (newType: GeoType) => {
    setTypeFilter(newType);
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
    setBlockedFilter('none');
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
    setBlockedFilter('none');
  };

  const hasFilters = search !== "" || blockedFilter !== 'none';

  const isFirstLoad = isLoading && !data;
  const isRefetching = isFetching && !isFirstLoad;
  const showEmpty = !isLoading && !isFetching && items.length === 0 && !isError;

  // Счётчики заблокированных для текущего типа
  const currentCounts = counts?.[typeFilter];
  const blockedRegCount = currentCounts?.blocked_reg ?? 0;
  const blockedFeedCount = currentCounts?.blocked_feed ?? 0;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(backUrl)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Globe className="w-6 h-6" />
            Geo IP локации
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Управление блокировками стран, регионов и городов.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((f) => {
            const c = counts?.[f.value];
            return (
              <Button
                key={f.value}
                variant={typeFilter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleTypeFilterChange(f.value)}
                className="gap-1.5"
              >
                <span>{f.label}</span>
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-medium tabular-nums rounded-sm bg-background/40">
                  {c?.total ?? "—"}
                </span>
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            disabled={!hasFilters}
            className="gap-1.5"
          >
            <FilterX className="w-4 h-4" />
            Сбросить
          </Button>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Поиск по имени, ISO или ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden bg-card relative">
        {isRefetching && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-[2px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>ISO</TableHead>
              <TableHead>Координаты</TableHead>
              <TableHead>Принадлежность</TableHead>
              <TableHead className="text-center">
                <div className="flex flex-col items-center gap-0.5">
                  <span>Регистрация</span>
                  {blockedRegCount > 0 && (
                    <button
                      onClick={() => setBlockedFilter(prev => prev === 'reg' ? 'none' : 'reg')}
                      className={`text-[11px] font-medium hover:underline cursor-pointer ${
                        blockedFilter === 'reg'
                          ? 'text-destructive font-bold underline'
                          : 'text-destructive'
                      }`}
                    >
                      Заблокировано: {blockedRegCount}
                    </button>
                  )}
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex flex-col items-center gap-0.5">
                  <span>Лента (Feed)</span>
                  {blockedFeedCount > 0 && (
                    <button
                      onClick={() => setBlockedFilter(prev => prev === 'feed' ? 'none' : 'feed')}
                      className={`text-[11px] font-medium hover:underline cursor-pointer ${
                        blockedFilter === 'feed'
                          ? 'text-yellow-600 font-bold underline dark:text-yellow-400'
                          : 'text-yellow-500'
                      }`}
                    >
                      Скрыто: {blockedFeedCount}
                    </button>
                  )}
                </div>
              </TableHead>
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
              // F5: отдельная ветка ошибки загрузки.
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle className="w-16 h-16 text-destructive/50" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Не удалось загрузить локации</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {extractErrorMessage(error, "Проверьте соединение с сервером")}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
                      <FilterX className="w-4 h-4 mr-2" />
                      Повторить
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : showEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="h-64 text-center text-muted-foreground animate-in fade-in duration-300">
                  <div className="flex flex-col items-center gap-3">
                    <Globe className="w-16 h-16 opacity-25" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Локации не найдены</p>
                      <p className="text-xs text-muted-foreground">
                        Попробуйте изменить фильтр или поисковый запрос
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, index) => {
                const isHighlighted = item.id === isHighlightedId;
                const rowClassName = [
                  "border-b border-border transition-colors",
                  isHighlighted ? "bg-blue-50 dark:bg-blue-950/40 " : "",
                  !isHighlighted && item.is_registration_blocked ? "bg-destructive/5" : "",
                ].filter(Boolean).join(" ");

                return (
                  <TableRow
                    key={item.id}
                    ref={isHighlighted ? highlightRowRef : undefined}
                    className={`${rowClassName} animate-in fade-in slide-in-from-bottom-1 duration-300`}
                    style={{
                      animationDelay: `${Math.min(index * 20, 400)}ms`,
                      animationFillMode: 'backwards',
                    }}
                  >
                    <TableCell className={`text-xs font-mono whitespace-nowrap tabular-nums ${
                      isHighlighted ? "text-primary font-bold" : "text-muted-foreground"
                    }`}>
                      #{item.id}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {item.name}
                      {item.original_name && item.original_name !== item.name && (
                        <span className="text-xs text-muted-foreground ml-2">({item.original_name})</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {TYPE_LABELS[item.type] ?? item.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.iso_code ? (
                        <code className="text-xs px-1.5 py-0.5 bg-muted rounded uppercase">
                          {item.iso_code}
                        </code>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground tabular-nums">
                      {item.latitude !== null && item.longitude !== null ? (
                        <span>{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</span>
                      ) : (
                        <span>—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.parent_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* F6: Switch сразу реагирует (optimistic update в хуке).
                            disabled только если ОПРЕДЕЛЁННЫЙ switch в ошибке. */}
                        <Switch
                          checked={item.is_registration_blocked}
                          onCheckedChange={() => toggleRegMutation.mutate(item.id)}
                          disabled={toggleRegMutation.isPending && toggleRegMutation.variables === item.id}
                        />
                        {item.is_registration_blocked ? (
                          <Badge variant="destructive" className="text-[10px]">Заблокир</Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px]">Доступен</Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={item.is_feed_blocked}
                          onCheckedChange={() => toggleFeedMutation.mutate(item.id)}
                          disabled={toggleFeedMutation.isPending && toggleFeedMutation.variables === item.id}
                        />
                        {item.is_feed_blocked ? (
                          <Badge variant="warning" className="text-[10px]">Скрытый</Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px]">В ленте</Badge>
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
    </div>
  );
}

