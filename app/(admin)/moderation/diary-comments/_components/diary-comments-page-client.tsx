// app/(admin)/moderation/diary-comments/_components/diary-comments-page-client.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  useDiaryCommentsList,
  useDiaryCommentCounts,
  type DiaryWithComments,
} from "@/hooks/admin/use-diaries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, MessagesSquare, Search, X, Loader2, RefreshCw, CheckCircle,
  Clock, CheckCircle as ApprovedIcon, XCircle, Trash2,
} from "lucide-react";

import { DiaryWithCommentsCard } from "./diary-with-comments-card";
import { ListPagination } from "@/components/admin/list-pagination";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { StatusTabs } from "@/components/admin/status-tabs";

const STATUS_TABS: Array<{
  value: "all" | "pending" | "approved" | "rejected" | "karantine";
  label: string;
  icon: typeof Clock;
  iconColor: string;
}> = [
  { value: "all", label: "Все", icon: MessagesSquare, iconColor: "text-muted-foreground" },
  { value: "pending", label: "Ожидают", icon: Clock, iconColor: "text-yellow-500" },
  { value: "approved", label: "Одобрены", icon: ApprovedIcon, iconColor: "text-green-500" },
  { value: "rejected", label: "Отклонены", icon: XCircle, iconColor: "text-red-500" },
  { value: "karantine", label: "Карантин", icon: Trash2, iconColor: "text-blue-500" },
];

export function DiaryCommentsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get("status") ?? (searchParams.get("diary_id") ? "all" : "pending")
  );
  const [page, setPage] = useState(parseInt(searchParams.get("page") ?? "1", 10));
  
  // Делаем diary_id полноценным state, чтобы можно было его очистить
  const initialDiaryId = searchParams.get("diary_id");
  const [diaryIdFilter, setDiaryIdFilter] = useState<number | null>(
    initialDiaryId ? parseInt(initialDiaryId, 10) : null
  );

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter !== "pending") params.set("status", statusFilter);
    if (page > 1) params.set("page", String(page));
    if (diaryIdFilter) params.set("diary_id", String(diaryIdFilter));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [search, statusFilter, page, diaryIdFilter, router]);

  // Поиск: debounce + моментальный сброс фильтров.
  useEffect(() => {
    if (search !== "") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatusFilter("all");
      setDiaryIdFilter(null); // Сбрасываем привязку к посту при поиске
    }
    setPage(1);
    const t = setTimeout(() => {
      setDebouncedSearch(search);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching, refetch } = useDiaryCommentsList({
    status: statusFilter as "all" | "pending" | "approved" | "rejected" | "karantine",
    q: debouncedSearch,
    diary_id: diaryIdFilter ?? undefined,
    page,
  });

  const items = useMemo(() => (data?.data ?? []) as DiaryWithComments[], [data]);
  const meta = data?.meta;
  const { data: countsData } = useDiaryCommentCounts();
  const stats = countsData?.stats;

  const isFirstLoad = isLoading && !data;
  const showEmpty = !isLoading && !isFetching && items.length === 0;

  const isIdSearch = debouncedSearch !== "" && /^\d+$/.test(debouncedSearch);
  const searchedId = (isIdSearch && !diaryIdFilter) ? parseInt(debouncedSearch, 10) : null;

  const handleSetStatus = (status: string) => {
    setStatusFilter(status);
    setSearch("");
    setDebouncedSearch("");
    setDiaryIdFilter(null); // Сбрасываем привязку к посту при смене таба
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("pending");
    setDiaryIdFilter(null); // Сбрасываем привязку к посту при сбросе
    setPage(1);
  };

  const hasFilters = search !== "" || statusFilter !== "pending" || diaryIdFilter !== null;
  const pendingTotal = stats?.pending ?? 0;
  const isKarantine = statusFilter === "karantine";

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <MessagesSquare className="w-6 h-6" />
              Комментарии к дневникам
              {pendingTotal > 0 && (
                <Badge variant="destructive" className="text-[10px] h-5 px-1.5 ml-1">
                  {pendingTotal} новых
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Всего: {stats?.total ?? 0} (в карантине: {stats?.karantine ?? 0})
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Обновить
        </Button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <StatusTabs
          tabs={STATUS_TABS}
          value={statusFilter}
          onChange={handleSetStatus}
          getCount={(v) => stats ? (stats as Record<string, number>)[v] : undefined}
        />

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <Input
            type="search"
            placeholder="ID комментария, текст или имя..."
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

      {isFirstLoad ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : showEmpty ? (
        <div className="bg-card border border-border rounded-lg p-16 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">
            {hasFilters ? "Ничего не найдено" : "Нет комментариев"}
          </h3>
          <p className="text-muted-foreground mt-1">
            {hasFilters
              ? `По запросу "${search}" ничего не найдено`
              : "Все комментарии проверены. Отличная работа!"}
          </p>
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-4">
              Сбросить фильтры
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {items.map((diary) => (
            <DiaryWithCommentsCard
              key={diary.id}
              diary={diary}
              searchedId={searchedId}
              statusFilter={statusFilter}
              isKarantine={isKarantine}
            />
          ))}
        </div>
      )}

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

