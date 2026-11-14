// app/(admin)/system/interests/_components/interests-table-client.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useInterestsList,
  useInterestsCounts,
  useDeleteInterest,
  useBoostInterest,
  useBulkInterests,
  type InterestCategoryFilter,
  type BulkInterestAction,
  type InterestList,
} from "@/hooks/admin/use-interests";
import { useInterestCategories } from "@/hooks/admin/use-interest-categories";
import { extractErrorMessage } from "@/lib/api";
import { getInitialUrlParam } from "@/lib/url-params";
import { formatDateTime } from "@/lib/format";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Sparkles, Plus, Search, X, Loader2, TrendingUp, Settings2 } from "lucide-react";
import { SEARCH_DEBOUNCE_MS, PER_PAGE, CATEGORY_FILTERS_PRESET, BULK_ACTION_LABELS } from "./_shared";
import { InterestRowActions } from "./interest-row-actions";
import { InterestCategoryModal } from "./interest-category-modal";
import { ListPagination } from "@/components/admin/list-pagination";

// Дефолтный буст при нажатии "Поднять в выдаче" (если 0).
const DEFAULT_BOOST_VALUE = 100;

export function InterestsTableClient() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<InterestCategoryFilter>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkAction, setBulkAction] = useState<BulkInterestAction | "">("");

  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InterestList | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  // Категория для bulk set_category (null = "без категории").
  const [bulkCategoryId, setBulkCategoryId] = useState<number | null>(null);

  const [urlInitialized, setUrlInitialized] = useState(false);
  const highlightRowRef = useRef<HTMLTableRowElement>(null);

  // Initial URL read.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(getInitialUrlParam("q"));
    setDebouncedSearch(getInitialUrlParam("q"));
    const urlCat = getInitialUrlParam("category_id");
    if (urlCat === "uncategorized" || urlCat === "boosted") {
      setCategoryFilter(urlCat);
    } else if (urlCat === "all" || !urlCat) {
      setCategoryFilter("all");
    } else if (/^\d+$/.test(urlCat)) {
      setCategoryFilter(parseInt(urlCat, 10));
    }
    setPage(parseInt(getInitialUrlParam("page") || "1", 10));
    setUrlInitialized(true);
  }, []);

  // URL-sync.
  useEffect(() => {
    if (!urlInitialized) return;
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (categoryFilter !== "all") {
      params.set("category_id", String(categoryFilter));
    }
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [search, categoryFilter, page, router, urlInitialized]);

  // Debounce 400ms.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      if (search && /^\d+$/.test(search)) {
        setCategoryFilter("all");
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const { data: countsData } = useInterestsCounts();
  const counts = countsData?.data;

  const { data: categoriesData } = useInterestCategories();
  const categories = categoriesData?.data ?? [];

  const { data, isLoading, isFetching, isError, error, refetch } = useInterestsList({
    q: debouncedSearch,
    category_id: categoryFilter,
    page,
    per_page: PER_PAGE,
  });

  const deleteMutation = useDeleteInterest();
  const boostMutation = useBoostInterest();
  const bulkMutation = useBulkInterests();

  const interests: InterestList[] = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;

  const isHighlightedId = debouncedSearch && /^\d+$/.test(debouncedSearch)
    ? parseInt(debouncedSearch, 10)
    : null;

  useEffect(() => {
    if (highlightRowRef.current && isHighlightedId) {
      highlightRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlightedId, interests]);

  const isFirstLoad = isLoading && !data;
  const isRefetching = isFetching && !isFirstLoad;
  const showEmpty = !isLoading && !isFetching && interests.length === 0 && !isError;

  const handleClearSearch = () => {
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelected(checked ? interests.map((i) => String(i.id)) : []);
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    setSelected((prev) =>
      checked ? [...prev, String(id)] : prev.filter((s) => s !== String(id))
    );
  };

  const handleClearSelection = () => {
    setSelected([]);
    setSelectAll(false);
    setBulkAction("");
    setBulkCategoryId(null);
  };

  const handleApplyBulkClick = () => {
    if (!bulkAction || selected.length === 0) return;
    // set_category без выбранной категории (null) допустим — "убрать из категории".
    setBulkConfirmOpen(true);
  };

  const handleConfirmBulk = () => {
    if (!bulkAction || selected.length === 0) return;
    bulkMutation.mutate(
      {
        ids: selected.map((s) => parseInt(s, 10)),
        action: bulkAction,
        category_id: bulkAction === "set_category" ? bulkCategoryId : undefined,
      },
      {
        onSuccess: () => {
          setBulkConfirmOpen(false);
          handleClearSelection();
        },
        onError: () => setBulkConfirmOpen(false),
      }
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const handleBoost = (interest: InterestList) => {
    boostMutation.mutate({ id: interest.id, searchBoost: DEFAULT_BOOST_VALUE });
  };

  const handleUnboost = (interest: InterestList) => {
    boostMutation.mutate({ id: interest.id, searchBoost: 0 });
  };

  const bulkActionLabel = bulkAction ? BULK_ACTION_LABELS[bulkAction] : null;
  const hasSelection = selected.length > 0;

  const bulkConfirmDescription =
    bulkAction === "delete"
      ? `Удалить ${selected.length} интересов навсегда? Связи с профилями юзеров будут удалены каскадом.`
      : bulkAction === "set_category"
      ? `Перенести ${selected.length} интересов в категорию «${
          bulkCategoryId
            ? categories.find((c) => c.id === bulkCategoryId)?.name ?? "—"
            : "Без категории"
        }»?`
      : "";

  // Preset-табы + динамические табы по категориям.
  const categoryTabs = [
    ...CATEGORY_FILTERS_PRESET,
    ...categories.map((c) => ({
      value: String(c.id) as unknown as InterestCategoryFilter,
      label: c.name,
      countKey: undefined as never,
      isCategory: true,
      categoryId: c.id,
    })),
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2 items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-semibold">
            Интересы
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCategoryModalOpen(true)}>
            <Settings2 className="w-4 h-4" />
            Категории
          </Button>
          <Button onClick={() => router.push("/system/interests/new")}>
            <Plus className="w-4 h-4" />
            Новый интерес
          </Button>
        </div>
      </div>

      {/* Filters + Bulk Bar */}      
        <div className="flex flex-wrap gap-1.5 max-w-full overflow-x-auto">
          {categoryTabs.map((f) => {
            const isActive =
              categoryFilter === f.value ||
              (typeof f === "object" && "isCategory" in f && categoryFilter === f.categoryId);
            const count =
              f.countKey && counts
                ? counts[f.countKey]
                : typeof f === "object" && "isCategory" in f
                ? categories.find((c) => c.id === f.categoryId)?.interests_count
                : undefined;
            return (
              <Button
                key={String(f.value)}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const next: InterestCategoryFilter =
                    typeof f === "object" && "isCategory" in f ? f.categoryId : (f.value as InterestCategoryFilter);
                  setCategoryFilter(next);
                  setSearch("");
                  setDebouncedSearch("");
                  setPage(1);
                }}
                className="gap-1.5 whitespace-nowrap"
              >
                <span>{f.label}</span>
                {count !== undefined && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-medium tabular-nums rounded-sm bg-background/40">
                    {count}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
     

      <div className="flex items-center justify-between gap-4">
        {/* Правая часть: всегда "Выбрано: N" (приглушено при 0),
            селекты + кнопки появляются только при выборе, поиск прижат вправо. */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <span className={`text-sm font-medium whitespace-nowrap tabular-nums ${hasSelection ? "" : "text-muted-foreground/60"}`}>
            Выбрано: <span className={hasSelection ? "text-primary" : ""}>{selected.length}</span>
          </span>

          {hasSelection && (
            <>
              <div className="w-px h-6 bg-border" />
              <Select
                value={bulkAction}
                onValueChange={(v: string | null) => setBulkAction((v ?? "") as BulkInterestAction | "")}
              >
                <SelectTrigger className="w-50">
                  {bulkActionLabel ? (
                    <span>{bulkActionLabel}</span>
                  ) : (
                    <span className="text-muted-foreground">Выберите действие...</span>
                  )}
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value="set_category">Перенести в категорию</SelectItem>
                  <SelectItem value="delete" className="text-destructive focus:text-destructive">
                    Удалить навсегда
                  </SelectItem>
                </SelectContent>
              </Select>

              {bulkAction === "set_category" && (
                <Select
                  value={bulkCategoryId === null ? "null" : String(bulkCategoryId)}
                  onValueChange={(v: string | null) => {
                    if (v === null || v === "null") setBulkCategoryId(null);
                    else setBulkCategoryId(parseInt(v, 10));
                  }}
                >
                  <SelectTrigger className="w-48">
                    {bulkCategoryId === null ? (
                      <span className="text-muted-foreground">Без категории</span>
                    ) : (
                      <span>{categories.find((c) => c.id === bulkCategoryId)?.name ?? "—"}</span>
                    )}
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectItem value="null">Без категории</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button size="sm" onClick={handleApplyBulkClick} disabled={bulkMutation.isPending}>
                {bulkMutation.isPending ? "Применяется..." : "Применить"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                <X className="w-4 h-4" /> Снять
              </Button>
              <div className="w-px h-6 bg-border" />
            </>
          )}        
        </div>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Поиск по имени или id..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8"
            />
            {search && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
              >
                <X className="w-4 h-4" />
              </button>
            )}
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
              <TableHead className="w-10">
                <Checkbox checked={selectAll} onCheckedChange={(c) => handleSelectAll(Boolean(c))} />
              </TableHead>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                  Название
                </span>
              </TableHead>
              <TableHead>Категория</TableHead>
              <TableHead className="text-right">Юзеров</TableHead>
              <TableHead className="text-right pr-10">Буст</TableHead>
              <TableHead>Обновлено</TableHead>
              <TableHead className="text-right">Действия</TableHead>
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
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-16 h-16 text-destructive/50" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Не удалось загрузить интересы</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {extractErrorMessage(error, "Проверьте соединение с сервером")}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
                      <Loader2 className="w-4 h-4 mr-2" />
                      Повторить
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : showEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="h-64 text-center text-muted-foreground animate-in fade-in duration-300">
                  <div className="flex flex-col items-center gap-3">
                    <Sparkles className="w-16 h-16 opacity-25" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Интересы не найдены</p>
                      <p className="text-xs text-muted-foreground">
                        Попробуйте изменить фильтр или поисковый запрос
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              interests.map((interest, index) => {
                const isHighlighted = interest.id === isHighlightedId;
                const isSelected = selected.includes(String(interest.id));

                const rowClassName = [
                  isHighlighted ? "bg-blue-50 dark:bg-blue-950/40 " : "",
                  !isHighlighted && isSelected ? "bg-muted/30" : "",
                  !isHighlighted && !isSelected && interest.search_boost > 0 ? "bg-yellow-500/5" : "",
                ]
                  .filter(Boolean)
                  .join("");

                return (
                  <TableRow
                    key={interest.id}
                    ref={isHighlighted ? highlightRowRef : undefined}
                    className={`${rowClassName} animate-in fade-in slide-in-from-bottom-1 duration-300`}
                    style={{
                      animationDelay: `${Math.min(index * 30, 400)}ms`,
                      animationFillMode: 'backwards',
                    }}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(c) => handleSelectOne(interest.id, Boolean(c))}
                      />
                    </TableCell>
                    <TableCell className={`text-xs font-mono whitespace-nowrap ${isHighlighted ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      #{interest.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {interest.search_boost > 0 && (
                          <span className="shrink-0 text-yellow-500" title={`Буст: ${interest.search_boost}`}>
                            <TrendingUp className="w-4 h-4" />
                          </span>
                        )}
                        <button
                          onClick={() => router.push(`/system/interests/${interest.id}/edit`)}
                          className="font-medium text-sm hover:text-primary hover:underline text-left"
                        >
                          {interest.name}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {interest.category ? (
                        <Badge variant="outline">{interest.category.name}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Без категории</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {interest.users_count}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums pr-10">
                      {interest.search_boost > 0 ? (
                        <span className="text-yellow-600 dark:text-yellow-500 font-medium">
                          +{interest.search_boost}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap tabular-nums">
                      {interest.updated_at && interest.created_at && interest.updated_at !== interest.created_at ? (
                        <span className="text-amber-600 dark:text-amber-500">
                          {formatDateTime(interest.updated_at)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <InterestRowActions
                        interest={interest}
                        onEdit={() => router.push(`/system/interests/${interest.id}/edit`)}
                        onBoost={() => handleBoost(interest)}
                        onUnboost={() => handleUnboost(interest)}
                        onDelete={() => setDeleteTarget(interest)}
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

      {/* Confirm: Bulk */}
      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title="Подтвердите действие"
        description={bulkConfirmDescription}
        confirmText="Применить"
        cancelText="Отмена"
        variant={bulkAction === "delete" ? "destructive" : "default"}
        isLoading={bulkMutation.isPending}
        onConfirm={handleConfirmBulk}
      />

      {/* Confirm: Delete Single */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Удалить интерес навсегда?"
        description={
          deleteTarget
            ? `Интерес «${deleteTarget.name}» будет удалён. У ${deleteTarget.users_count} юзеров он пропадёт из профиля.`
            : undefined
        }
        confirmText="Удалить"
        cancelText="Отмена"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />

      {/* Category manager modal */}
      <InterestCategoryModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        selectedId={null}
        onSelect={() => {
          /* В списке интересов клик по категории в модалке не выбирает её как фильтр;
             модалка — только для управления. Фильтр выбирается табами выше. */
        }}
      />
    </div>
  );
}
