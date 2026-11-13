// app/(admin)/moderation/diary/_components/diaries-page-client.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { RubricFormModal } from "./rubric-form-modal";
import { DeleteRubricModal } from "./delete-rubric-modal";

import {
  useDiariesList,
  useRubricsList,
  useDiaryCounts,
  type DiaryItem,
  type DiaryRubric,
} from "@/hooks/admin/use-diaries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, BookOpen, Search, X, Loader2, RefreshCw,
  Trash2, Plus, FolderTree, EyeOff
} from "lucide-react";

import { DiaryRow } from "./diary-row";
import { RubricRow } from "./rubric-row";
import { STATUS_TABS, DEFAULT_STATUS, DEFAULT_TRASHED, DEFAULT_RUBRIC, PER_PAGE, SEARCH_DEBOUNCE_MS } from "./diary-shared";
import { ListPagination } from "@/components/admin/list-pagination";

export function DiariesPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showRubricModal, setShowRubricModal] = useState(false);
  const [editingRubric, setEditingRubric] = useState<DiaryRubric | null>(null);
  const [deletingRubric, setDeletingRubric] = useState<DiaryRubric | null>(null);

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") ?? "diaries");
  
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? DEFAULT_STATUS);
  const [trashedFilter, setTrashedFilter] = useState(searchParams.get("trashed") ?? DEFAULT_TRASHED);
  const [rubricFilter, setRubricFilter] = useState(searchParams.get("rubric") ?? DEFAULT_RUBRIC);
  const [page, setPage] = useState(parseInt(searchParams.get("page") ?? "1", 10));

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    if (search) params.set("q", search);
    if (activeTab === "diaries") {
      if (statusFilter !== DEFAULT_STATUS) params.set("status", statusFilter);
      if (trashedFilter !== DEFAULT_TRASHED) params.set("trashed", trashedFilter);
      if (rubricFilter !== DEFAULT_RUBRIC) params.set("rubric", rubricFilter);
    }
    if (page > 1) params.set("page", String(page));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [activeTab, search, statusFilter, trashedFilter, rubricFilter, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Поиск: debounce + сброс фильтров ВНУТРИ timer.
  //
  // ВАЖНО: все пять state-обновлений (debouncedSearch + statusFilter +
  // trashedFilter + rubricFilter + page) должны сработать атомарно —
  // внутри одного setTimeout tick. Иначе получится два queryKey change подряд:
  //   1) {q: старый, status: all, ...} — React Query кидает запрос
  //      с ПРОМЕЖУТОЧНЫМ невалидным состоянием
  //   2) {q: новый, status: all, ...} — финальный запрос
  // Между ними (≈400ms) таблица показывает результаты первого (невалидного)
  // запроса → мелькание «сначала все, потом нужное».
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      if (search) {
        // При поиске сбрасываем все фильтры — искомый ID/имя может быть
        // в любом статусе/trashed/rubric.
        setStatusFilter("all");
        setTrashedFilter("without");
        setRubricFilter("all");
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const isDiaries = activeTab === "diaries";

  // Запросы с enabled flag — только активная вкладка делает запрос.
  // Раньше оба hook'а были активны всегда → 2 запроса на каждый rerender.
  const diariesQuery = useDiariesList(
    {
      status: statusFilter,
      trashed: trashedFilter as "with" | "only" | "without",
      rubric: rubricFilter,
      q: debouncedSearch,
      page,
      per_page: PER_PAGE,
    },
    { enabled: isDiaries }
  );

  const rubricsQuery = useRubricsList(
    { q: debouncedSearch, page, per_page: PER_PAGE },
    { enabled: !isDiaries }
  );

  const query = isDiaries ? diariesQuery : rubricsQuery;
  const { data, isLoading, isFetching, refetch } = query;

  const items = useMemo(() => (data?.data ?? []) as DiaryItem[] | DiaryRubric[], [data]);
  const meta = data?.meta;

  // Counts — из отдельного stable query (не зависит от filter/search/page).
  // Раньше брали из data?.stats — скачкообразный UI при смене вкладок.
  const { data: countsData } = useDiaryCounts();
  const stats = countsData?.stats;

  // all_rubrics приходит из list-response (cached 60s на бэке) — используется
  // только когда активна вкладка постов, для dropdown фильтра рубрики.
  const allRubrics = (isDiaries ? diariesQuery.data?.all_rubrics : rubricsQuery.data?.all_rubrics) ?? [];

  const isFirstLoad = isLoading && !data;
  const showEmpty = !isLoading && !isFetching && items.length === 0;

  const isIdSearch = debouncedSearch !== "" && /^\d+$/.test(debouncedSearch);
  const searchedId = isIdSearch ? parseInt(debouncedSearch, 10) : null;

  const handleSetTab = (tab: string) => {
    setActiveTab(tab);
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const handleSetStatus = (status: string) => {
    setStatusFilter(status);
    setTrashedFilter(DEFAULT_TRASHED);
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const handleToggleTrashed = () => {
    setTrashedFilter(prev => prev === "only" ? DEFAULT_TRASHED : "only");
    setStatusFilter("all");
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter(DEFAULT_STATUS);
    setTrashedFilter(DEFAULT_TRASHED);
    setRubricFilter(DEFAULT_RUBRIC);
    setPage(1);
  };

  const hasFilters = isDiaries
    ? (search !== "" || statusFilter !== DEFAULT_STATUS || trashedFilter !== DEFAULT_TRASHED || rubricFilter !== DEFAULT_RUBRIC)
    : (search !== "");

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
              <BookOpen className="w-6 h-6" />
              Дневники
            </h1>
            {isDiaries && stats ? (
              <p className="text-sm text-muted-foreground mt-1 tabular-nums">
                Всего: <span className="font-medium">{stats.all}</span> • В очереди: <span className="font-medium text-yellow-600 dark:text-yellow-500">{stats.pending}</span>
              </p>
            ) : !isDiaries ? (
              <p className="text-sm text-muted-foreground mt-1">
                Системные рубрики — общие для всех пользователей
              </p>
            ) : null}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Обновить
        </Button>
      </div>

      {/* Табы */}
      <div className="flex border-b border-border">
        <button
          onClick={() => handleSetTab("diaries")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            isDiaries ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Записи
          {stats && (
            <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-medium tabular-nums rounded-sm bg-muted">
              {stats.all}
            </span>
          )}
        </button>
        <button
          onClick={() => handleSetTab("rubrics")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            !isDiaries ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Системные рубрики
          {stats && (
            <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-medium tabular-nums rounded-sm bg-muted">
              {stats.rubrics_count}
            </span>
          )}
        </button>
      </div>

      {/* Фильтры */}
      {isDiaries ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((t) => {
              const Icon = t.icon;
              const count = stats
                ? (t.value === "all" ? stats.all : (stats as Record<string, number>)[t.value])
                : undefined;
              return (
                <Button
                  key={t.value}
                  variant={statusFilter === t.value && trashedFilter === DEFAULT_TRASHED ? "default" : "secondary"}
                  size="sm"
                  onClick={() => handleSetStatus(t.value)}
                  className="gap-1.5"
                >
                  <Icon className={`w-4 h-4 ${t.iconColor}`} />
                  {t.label}
                  {count !== undefined && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1 tabular-nums">
                      {count}
                    </Badge>
                  )}
                </Button>
              );
            })}
            <Button
              variant={trashedFilter === "only" ? "destructive" : "secondary"}
              size="sm"
              onClick={handleToggleTrashed}
              className="gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Карантин
              {stats && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1 tabular-nums">
                  {stats.trashed}
                </Badge>
              )}
            </Button>
          </div>

          {/* Фильтр рубрики + Поиск + Сбросить — справа, рядом */}
          <div className="flex items-center gap-2 ml-auto">
             {hasFilters && (
              <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-muted-foreground">
                <X className="w-4 h-4" /> Сбросить
              </Button>
            )}

                        <Select
              value={rubricFilter}
              onValueChange={(v: string | null) => { setRubricFilter(v ?? DEFAULT_RUBRIC); setPage(1); }}
            >
              <SelectTrigger className="w-50 h-9">
                {rubricFilter === DEFAULT_RUBRIC ? (
                  "Все рубрики"
                ) : rubricFilter === "none" ? (
                  "Без рубрики"
                ) : (
                  (() => {
                    const r = allRubrics.find(r => String(r.id) === rubricFilter);
                    if (!r) return "Рубрика";
                    return (
                      <span className={`flex items-center gap-1.5 ${!r.is_active ? "text-muted-foreground" : ""}`}>
                        {!r.is_active && <EyeOff className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">{r.name}</span>
                      </span>
                    );
                  })()
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_RUBRIC}>Все рубрики</SelectItem>
                <SelectItem value="none">Без рубрики</SelectItem>
                {allRubrics.map(r => (
                  <SelectItem 
                    key={r.id} 
                    value={String(r.id)}
                    className={!r.is_active ? "text-muted-foreground" : ""}
                  >
                    <span className="flex items-center gap-1.5">                      
                      {r.name}
                      {!r.is_active && <EyeOff className="w-3.5 h-3.5 shrink-0" />}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative w-70">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <Input
                type="search"
                placeholder="ID, название или имя..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8"
              />
              {search && (
                <button onClick={() => { setSearch(""); setDebouncedSearch(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>           
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
           
          {/* Поиск + Сбросить + Создать рубрику — справа */}
          <Button variant="default" size="sm" onClick={() => { setEditingRubric(null); setShowRubricModal(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Создать системную рубрику
          </Button>

          <div className="flex items-center gap-2">
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-muted-foreground">
                <X className="w-4 h-4" /> Сбросить
              </Button>
            )}

            <div className="relative w-70">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <Input
                type="search"
                placeholder="Поиск по названию или ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8"
              />
              {search && (
                <button onClick={() => { setSearch(""); setDebouncedSearch(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>           
          </div>
        </div>
      )}

      {/* Таблица */}
      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {isDiaries ? (
                <>
                  <TableHead className="w-14">ID</TableHead>
                  <TableHead className="w-56">Автор</TableHead>
                  <TableHead className="w-60">Заголовок</TableHead>
                  <TableHead className="w-44">Рубрика</TableHead>
                  <TableHead className="w-32">Статус</TableHead>
                  <TableHead className="w-24 text-center">Статистика</TableHead>
                  <TableHead className="w-40">Даты</TableHead>
                  <TableHead className="w-24 text-right">Действия</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="w-14">ID</TableHead>
                  <TableHead className="w-14">Сорт.</TableHead>
                  <TableHead className="w-60">Название</TableHead>
                  <TableHead className="w-100">Описание</TableHead>
                  <TableHead className="w-20 text-center">Постов</TableHead>
                  <TableHead className="w-24">Статус</TableHead>
                  <TableHead className="w-24 text-right">Действия</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isFirstLoad ? (
              <TableRow>
                <TableCell colSpan={isDiaries ? 8 : 7} className="py-16">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ) : showEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={isDiaries ? 8 : 7} className="h-64 text-center text-muted-foreground animate-in fade-in duration-300">
                  <div className="flex flex-col items-center gap-3">
                    {isDiaries ? <BookOpen className="w-16 h-16 opacity-25" /> : <FolderTree className="w-16 h-16 opacity-25" />}
                    <p className="text-sm font-medium">{isDiaries ? "Записи не найдены" : "Рубрики не найдены"}</p>
                    {hasFilters && (
                      <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-2">
                        Сбросить фильтры
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : isDiaries ? (
              (items as DiaryItem[]).map((diary, index) => (
                <DiaryRow
                  key={diary.id}
                  diary={diary}
                  isHighlighted={diary.id === searchedId}
                  index={index}
                />
              ))
            ) : (
              (items as DiaryRubric[]).map((rubric, index) => (
                <RubricRow
                  key={rubric.id}
                  rubric={rubric}
                  isHighlighted={rubric.id === searchedId}
                  index={index}
                  onEdit={(r) => { setEditingRubric(r); setShowRubricModal(true); }}
                  onDelete={(r) => setDeletingRubric(r)}
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

      {/* Модалки рубрик */}
      <RubricFormModal
        open={showRubricModal}
        onOpenChange={setShowRubricModal}
        editingRubric={editingRubric}
      />
      <DeleteRubricModal
        open={deletingRubric !== null}
        onOpenChange={(open) => { if (!open) setDeletingRubric(null); }}
        rubric={deletingRubric}
        allRubrics={allRubrics}
      />
    </div>
  );
}
