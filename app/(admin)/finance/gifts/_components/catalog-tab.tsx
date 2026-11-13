// app/(admin)/finance/gifts/_components/catalog-tab.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  useGiftsList,
  useCreateGift,
  useUpdateGift,
  useDeleteGift,
  useToggleGiftStatus,
  type GiftItem,
  type GiftFormData,
} from "@/hooks/admin/use-gifts";
import { extractErrorMessage, extractValidationErrors } from "@/lib/api";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
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
  Search, X, Loader2, Plus, Pencil, Trash2, Package, ImageOff, AlertCircle, RefreshCw,
} from "lucide-react";
import { SEARCH_DEBOUNCE_MS, PER_PAGE, CATEGORY_OPTIONS, TYPE_OPTIONS, getInitialUrlParam } from "./_shared";
import { GiftModal } from "./gift-modal";
import { ListPagination } from "@/components/admin/list-pagination";

 
export function CatalogTab({
  pendingSearch,
  onPendingSearchConsumed,
}: {
  pendingSearch: string | null;
  onPendingSearchConsumed: () => void;
}) {
  const router = useRouter();

  // Initial state — пустой (для SSR). После mount читаем URL синхронно
  // через window.location.search и обновляем state. Это предотвращает
  // hydration mismatch: сервер рендерит с пустым search, клиент тоже
  // стартует с пустым → React happy. Потом useEffect догоняет.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  // После mount: читаем URL один раз и наполняем state.
  // window.location.search актуален на клиенте, в отличие от useSearchParams
  // (устаревший snapshot при remount).
  const [urlInitialized, setUrlInitialized] = useState(false);
  useEffect(() => {
          // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(getInitialUrlParam("q"));
    setDebouncedSearch(getInitialUrlParam("q"));
    setCategoryFilter(getInitialUrlParam("category") || "all");
    setTypeFilter(getInitialUrlParam("type") || "all");
    setPage(parseInt(getInitialUrlParam("page") || "1", 10));
    setUrlInitialized(true);
  }, []);

  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [editingGift, setEditingGift] = useState<GiftItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GiftItem | null>(null);
  // F9: per-row toggle pending. Если админ быстро кликает toggle на 2 разных
  // подарках — оба спиннера крутятся независимо. Раньше disabled был на всех сразу.
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  const highlightRowRef = useRef<HTMLTableRowElement>(null);

  // F10: URL-sync только тут (PageClient только пишет ?tab=...).
  // НЕ пишем URL до завершения initial mount — иначе затрём ?q=rose из
  // прямого захода пустым search (т.к. initial state пустой до useEffect).
  useEffect(() => {
    if (!urlInitialized) return;
    const params = new URLSearchParams();
    params.set("tab", "catalog");
    if (search) params.set("q", search);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (page > 1) params.set("page", String(page));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [search, categoryFilter, typeFilter, page, router, urlInitialized]);

  // F7: debounce 400ms вместо 1000ms.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      if (search !== "") {
        setCategoryFilter("all");
        setTypeFilter("all");
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  // Применяем pendingSearch от клика из истории дарений
  useEffect(() => {
    if (pendingSearch !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearch(pendingSearch);
      setDebouncedSearch(pendingSearch);
      setPage(1);
      setCategoryFilter("all");
      setTypeFilter("all");
      onPendingSearchConsumed();
    }
  }, [pendingSearch, onPendingSearchConsumed]);

  const { data, isLoading, isFetching, isError, error, refetch } = useGiftsList({
    q: debouncedSearch,
    category: categoryFilter,
    type: typeFilter,
    page,
    per_page: PER_PAGE,
  });

  const items: GiftItem[] = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;
  const counts = data?.counts;

  const isFirstLoad = isLoading && !data;
  const showEmpty = !isLoading && !isFetching && items.length === 0 && !isError;

  const isIdSearch = debouncedSearch !== "" && /^\d+$/.test(debouncedSearch);
  const searchedId = isIdSearch ? parseInt(debouncedSearch, 10) : null;

  useEffect(() => {
    if (searchedId && items.length > 0) {
      const match = items.find((g) => g.id === searchedId);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (match) setHighlightId(match.id);
    } else {
      setHighlightId(null);
    }
  }, [searchedId, items]);

  useEffect(() => {
    if (highlightRowRef.current && highlightId) {
      highlightRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId]);

  const createMutation = useCreateGift();
  const updateMutation = useUpdateGift();
  const deleteMutation = useDeleteGift();
  const toggleMutation = useToggleGiftStatus();
  const isMutating = createMutation.isPending || updateMutation.isPending;

  const openCreate = () => {
    setEditingGift(null);
    setShowModal(true);
  };

  const openEdit = (gift: GiftItem) => {
    setEditingGift(gift);
    setShowModal(true);
  };

  const handleToggle = (giftId: number) => {
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.add(giftId);
      return next;
    });
    toggleMutation.mutate(giftId, {
      onSettled: () => {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(giftId);
          return next;
        });
      },
    });
  };

  const handleSave = (formData: GiftFormData, onError: (errors: Record<string, string[]>) => void) => {
    if (editingGift) {
      updateMutation.mutate(
        { id: editingGift.id, payload: formData },
        {
          onSuccess: () => setShowModal(false),
          onError: (err: unknown) => {
            const backendErrors = extractValidationErrors(err);
            if (backendErrors) onError(backendErrors);
            else toast.error(extractErrorMessage(err, "Ошибка обновления подарка"));
          },
        }
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => setShowModal(false),
        onError: (err: unknown) => {
          const backendErrors = extractValidationErrors(err);
          if (backendErrors) onError(backendErrors);
          else toast.error(extractErrorMessage(err, "Ошибка создания подарка"));
        },
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSettled: () => setDeleteTarget(null),
    });
  };

  return (
    <div className="space-y-4">
      {/* Верхняя панель */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Select
            value={categoryFilter}
            onValueChange={(v: string | null) => {
              setCategoryFilter(v ?? "all");
              setSearch("");
              setDebouncedSearch("");
              setPage(1);
            }}
          >
            <SelectTrigger className="min-w-40 h-9">
              {categoryFilter === "all"
                ? "Все категории"
                : CATEGORY_OPTIONS.find((o) => o.value === categoryFilter)?.label ?? "Категория"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={typeFilter}
            onValueChange={(v: string | null) => {
              setTypeFilter(v ?? "all");
              setSearch("");
              setDebouncedSearch("");
              setPage(1);
            }}
          >
            <SelectTrigger className="min-w-36 h-9">
              {typeFilter === "all"
                ? "Все типы"
                : TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label ?? "Тип"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
            <Input
              type="search"
              placeholder="Поиск по названию или ID..."
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

        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Добавить подарок
        </Button>
      </div>

      {/* Счётчик */}
      <div className="text-xs text-muted-foreground">
        Всего в каталоге: <span className="font-medium text-foreground">{counts?.catalog ?? 0}</span>
      </div>

      {/* Таблица */}
      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <Table className="table-fixed w-full min-w-230">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-14">ID</TableHead>
              <TableHead className="w-20">Картинка</TableHead>
              <TableHead className="w-50">Название</TableHead>
              <TableHead className="w-35">Категория</TableHead>
              <TableHead className="w-25">Тип</TableHead>
              <TableHead className="w-25">Цена</TableHead>
              <TableHead className="w-25 text-center">Статус</TableHead>
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
              // F8: отдельная ветка ошибки загрузки (раньше показывало "Каталог пуст")
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle className="w-16 h-16 text-destructive/50" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Не удалось загрузить каталог</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {extractErrorMessage(error, "Проверьте соединение с сервером")}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
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
                    <Package className="w-16 h-16 opacity-25" />
                    <p className="text-sm font-medium">Каталог пуст</p>
                    <p className="text-xs">Нажмите «Добавить подарок», чтобы создать первый</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((gift, index) => {
                const isHighlighted = gift.id === highlightId;
                const rowClassName = [
                  "border-b border-border transition-colors",
                  isHighlighted ? "bg-blue-50 dark:bg-blue-950/40 " : "",
                ].filter(Boolean).join(" ");

                return (
                  <TableRow
                    key={gift.id}
                    ref={isHighlighted ? highlightRowRef : undefined}
                    className={`${rowClassName} animate-in fade-in slide-in-from-bottom-1 duration-300`}
                    style={{
                      animationDelay: `${Math.min(index * 15, 400)}ms`,
                      animationFillMode: "backwards",
                    }}
                  >
                    <TableCell className={`text-xs font-mono whitespace-nowrap tabular-nums align-top pt-3 ${isHighlighted ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      #{gift.id}
                    </TableCell>

                    <TableCell className="align-top pt-3">
                      {gift.image_url ? (
                        <div className="w-14 h-14 overflow-hidden rounded-md bg-muted shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={gift.image_url} alt={gift.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 flex items-center justify-center rounded-md bg-muted border border-dashed border-border">
                          <ImageOff className="w-4 h-4 text-muted-foreground/50" />
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="align-top pt-3">
                      <button
                        onClick={() => openEdit(gift)}
                        className="text-left hover:text-primary transition-colors group"
                      >
                        <div className="font-medium text-sm cursor-pointer hover:underline">{gift.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{gift.slug}</div>
                      </button>
                    </TableCell>

                    <TableCell className="align-top pt-3">
                      {gift.category_label ? (
                        <Badge variant="secondary" className="rounded-full text-[10px]">
                          {gift.category_label}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Тип подарка */}
                    <TableCell className="align-top pt-3">
                      {(() => {
                        const typeOpt = TYPE_OPTIONS.find((o) => o.value === gift.type);
                        return typeOpt ? (
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${typeOpt.color}`}>
                            {typeOpt.label}
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Неизвестно</Badge>
                        );
                      })()}
                    </TableCell>

                    <TableCell className="font-medium text-sm align-top pt-3">
                      {gift.price.toLocaleString("ru-RU")} ед.
                    </TableCell>

                    <TableCell className="text-center align-top pt-3">
                      <button
                        onClick={() => handleToggle(gift.id)}
                        className="cursor-pointer"
                        disabled={togglingIds.has(gift.id)}
                        title="Переключить статус"
                      >
                        {togglingIds.has(gift.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
                        ) : gift.is_active ? (
                          <Badge variant="success" className="text-[10px]">В продаже</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Скрыт</Badge>
                        )}
                      </button>
                    </TableCell>

                    <TableCell className="text-right align-top pt-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(gift)}
                          title="Редактировать"
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteTarget(gift)}
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
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

      {/* Модалка создания/редактирования */}
      <GiftModal
        open={showModal}
        onOpenChange={setShowModal}
        gift={editingGift}
        onSave={handleSave}
        isLoading={isMutating}
      />

      {/* Подтверждение удаления */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Удалить подарок из каталога?"
        description={deleteTarget
          ? `«${deleteTarget.name}» будет удалён. Если его уже дарили — он будет скрыт из продажи, но сохранён в истории.`
          : ""}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}

