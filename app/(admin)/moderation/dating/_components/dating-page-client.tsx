// app/(admin)/moderation/dating/_components/dating-page-client.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
// import { toast } from "sonner";
import {
  useDatingList,
  useDatingCounts,
  type SwipeItem,
  type MatchItem,
} from "@/hooks/admin/use-dating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Heart, Search, X, Loader2, RefreshCw,
  ThumbsUp, ThumbsDown, Star,
} from "lucide-react";

import { SwipeRow } from "./swipe-row";
import { MatchRow } from "./match-row";
import { SEARCH_DEBOUNCE_MS } from "./dating-shared";
import { ListPagination } from "@/components/admin/list-pagination";

const TYPE_FILTERS = [
  { value: "all", label: "Все", icon: null },
  { value: "like", label: "Лайки", icon: ThumbsUp, iconColor: "text-green-500" },
  { value: "dislike", label: "Дизлайки", icon: ThumbsDown, iconColor: "text-red-500" },
  { value: "superlike", label: "Суперлайки", icon: Star, iconColor: "text-yellow-500" },
];

export function DatingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") ?? "");
  const [viewMode, setViewMode] = useState<"swipes" | "matches">(
    (searchParams.get("mode") as "swipes" | "matches") ?? "swipes"
  );
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") ?? "all");
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") ?? "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") ?? "1", 10));

  // M5: requestedModeRef удалён — был dead code (объявлён, записывался, но никогда не читался).

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("mode", viewMode);
    if (search) params.set("q", search);
    if (typeFilter !== "all" && viewMode === "swipes") params.set("type", typeFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (page > 1) params.set("page", String(page));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [search, viewMode, typeFilter, dateFrom, dateTo, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Поиск: debounce + моментальный сброс type filter на "all".
  // При вводе текста → сразу сбрасываем type filter (like/dislike/superlike)
  // (искомый ID/имя может быть в любом типе свайпа).
  // Сброс идёт НЕ внутри debounce timer → нет задержки.
  useEffect(() => {
    if (search !== "") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTypeFilter("all");
    }
    setPage(1);
    const t = setTimeout(() => {
      setDebouncedSearch(search);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching, refetch } = useDatingList({
    mode: viewMode,
    type: typeFilter,
    q: debouncedSearch,
    dateFrom,
    dateTo,
    page,
  });

  const items = useMemo(() => (data?.data ?? []) as SwipeItem[] | MatchItem[], [data]);
  const meta = data?.meta;
  // Counts — из отдельного stable query (не зависит от filter/search/page).
  // Раньше брали из data?.stats — скачкообразный UI при смене вкладок.
  const { data: countsData } = useDatingCounts();
  const stats = countsData?.stats;

  const isFirstLoad = isLoading && !data;
  const showEmpty = !isLoading && !isFetching && items.length === 0;

  const isIdSearch = debouncedSearch !== "" && /^\d+$/.test(debouncedSearch);
  const searchedId = isIdSearch ? parseInt(debouncedSearch, 10) : null;

  const handleSetViewMode = (mode: "swipes" | "matches") => {
    setViewMode(mode);
    setSearch("");
    setDebouncedSearch("");
    setTypeFilter("all");
    setPage(1);
  };

  const handleSetTypeFilter = (type: string) => {
    setTypeFilter(type);
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

    // 🤖 Авто-подстройка дат (Вариант 3)
  const handleSetDateFrom = (v: string) => {
    setDateFrom(v);
    // Если новая дата "С" больше даты "По" — двигаем "По" forward
    if (v && dateTo && new Date(v) > new Date(dateTo)) {
      setDateTo(v);
    }
    setPage(1);
  };

  const handleSetDateTo = (v: string) => {
    setDateTo(v);
    // Если новая дата "По" меньше даты "С" — двигаем "С" backward
    if (v && dateFrom && new Date(v) < new Date(dateFrom)) {
      setDateFrom(v);
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const hasFilters = search !== "" || typeFilter !== "all" || dateFrom !== "" || dateTo !== "";

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* Шапка */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Heart className="w-6 h-6 " />
              Модерация знакомств
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Свайпов: {stats?.total_swipes ?? 0} • Матчей: {stats?.total_matches ?? 0}
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Обновить
        </Button>
      </div>

      {/* Панель фильтров */}
      <div className="flex flex-col gap-3">
        {/* Ряд 1: Режим (Свайпы/Матчи) */}
        <div className="flex gap-1.5">
          <Button
            variant={viewMode === "swipes" ? "default" : "secondary"}
            size="sm"
            onClick={() => handleSetViewMode("swipes")}
            className="gap-1.5"
          >
            Свайпы
            <Badge variant="secondary" className="text-[10px] h-5 px-1">
              {stats?.total_swipes ?? "—"}
            </Badge>
          </Button>
          <Button
            variant={viewMode === "matches" ? "default" : "secondary"}
            size="sm"
            onClick={() => handleSetViewMode("matches")}
            className="gap-1.5"
          >
            Матчи
            <Badge variant="secondary" className="text-[10px] h-5 px-1">
              {stats?.total_matches ?? "—"}
            </Badge>
          </Button>
        </div>

        {/* Ряд 2: Типы свайпов (слева) + Даты и Поиск (справа) */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* ЛЕВАЯ ЧАСТЬ: Фильтры по типу свайпа (показываем только в режиме swipes) */}
          <div className="flex gap-1.5 flex-wrap">
            {viewMode === "swipes" && (
              TYPE_FILTERS.map((t) => (
                <Button
                  key={t.value}
                  variant={typeFilter === t.value ? "default" : "secondary"}
                  size="sm"
                  onClick={() => handleSetTypeFilter(t.value)}
                  className="gap-1.5"
                >
                  {t.icon && <t.icon className={`w-4 h-4 ${t.iconColor}`} />}
                  {t.label}
                  {stats && t.value !== "all" && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1">
                      {t.value === "like" ? stats.total_likes :
                       t.value === "dislike" ? stats.total_dislikes :
                       t.value === "superlike" ? stats.total_superlikes : "—"}
                    </Badge>
                  )}
                </Button>
              ))
            )}
          </div>

          {/* ПРАВАЯ ЧАСТЬ: Сбросить (слева) + Даты + Поиск (справа) */}
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {hasFilters && (
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                <X className="w-4 h-4 mr-1" />
                Сбросить
              </Button>
            )}

            <DatePicker value={dateFrom} onChange={handleSetDateFrom} placeholder="С" />
            <span className="text-muted-foreground text-sm">—</span>
            <DatePicker value={dateTo} onChange={handleSetDateTo} placeholder="По" />
            
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <Input
                type="search"
                placeholder="ID, имя или email..."
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
      </div>

      {/* Таблица */}
      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <Table className="table-fixed w-full min-w-225">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-16">ID</TableHead>
              {viewMode === "swipes" ? (
                <>
                  <TableHead className="w-60">Оценил</TableHead>
                  <TableHead className="w-60">Получил оценку</TableHead>
                  <TableHead className="w-30">Тип</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="w-60">Пользователь 1</TableHead>
                  <TableHead className="w-60">Пользователь 2</TableHead>
                  <TableHead className="w-30">Статус</TableHead>
                </>
              )}
              <TableHead className="w-30">Дата</TableHead>
              <TableHead className="w-20 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isFirstLoad ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ) : showEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-64 text-center text-muted-foreground animate-in fade-in duration-300">
                  <div className="flex flex-col items-center gap-3">
                    <Heart className="w-16 h-16 opacity-25" />
                    <p className="text-sm font-medium">Нет данных для отображения</p>
                    {hasFilters && (
                      <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-2">
                        Сбросить фильтры
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : viewMode === "swipes" ? (
              (items as SwipeItem[]).map((swipe, index) => (
                <SwipeRow
                  key={swipe.id}
                  swipe={swipe}
                  isHighlighted={swipe.id === searchedId}
                  index={index}
                />
              ))
            ) : (
              (items as MatchItem[]).map((match, index) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  isHighlighted={match.id === searchedId}
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
