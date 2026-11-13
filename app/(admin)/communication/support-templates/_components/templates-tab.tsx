"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  useSupportTemplatesList,
  useSupportCategoriesList,
  useDeleteSupportTemplate,
  type SupportTemplateItem,
  type SupportCategoryItem,
} from "@/hooks/admin/use-support-templates";
import { extractErrorMessage } from "@/lib/api";
import { getInitialUrlParam } from "@/lib/url-params";
import { formatDate } from "@/lib/format";
import { stripMarkdown } from "@/components/admin/message-content";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, X, Loader2, Plus, Pencil, Trash2, FileSearch, AlertCircle,
} from "lucide-react";
import { SEARCH_DEBOUNCE_MS, PER_PAGE } from "./_shared";
import { ListPagination } from "@/components/admin/list-pagination";

export function TemplatesTab() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupportTemplateItem | null>(null);

  const [urlInitialized, setUrlInitialized] = useState(false);
  const highlightRowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(getInitialUrlParam("q"));
    setDebouncedSearch(getInitialUrlParam("q"));
    setCategoryFilter(getInitialUrlParam("category") || "all");
    setPage(parseInt(getInitialUrlParam("page") || "1", 10));
    setUrlInitialized(true);
  }, []);

  const { data: categoriesData } = useSupportCategoriesList("");
  const categories: SupportCategoryItem[] = useMemo(() => categoriesData?.data ?? [], [categoriesData]);

  const { data, isLoading, isFetching, isError, error, refetch } = useSupportTemplatesList({
    q: debouncedSearch,
    category: categoryFilter,
    page,
    per_page: PER_PAGE,
  });

  const items: SupportTemplateItem[] = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;
  const counts = data?.counts;

  const isFirstLoad = isLoading && !data;
  const showEmpty = !isLoading && !isFetching && items.length === 0 && !isError;

  useEffect(() => {
    if (!urlInitialized) return;
    const params = new URLSearchParams();
    params.set("tab", "templates");
    if (search) params.set("q", search);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (page > 1) params.set("page", String(page));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [search, categoryFilter, page, router, urlInitialized]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      if (search !== "") {
        setCategoryFilter("all");
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const handleSetCategoryFilter = (categoryId: string) => {
    setCategoryFilter(categoryId);
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setCategoryFilter("all");
    setPage(1);
  };

  const hasFilters = search !== "" || categoryFilter !== "all";

  const isIdSearch = debouncedSearch !== "" && /^\d+$/.test(debouncedSearch);
  const searchedId = isIdSearch ? parseInt(debouncedSearch, 10) : null;

  useEffect(() => {
    if (searchedId && items.length > 0) {
      const match = items.find((t) => t.id === searchedId);
      if (match) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHighlightId(match.id);
      }
    } else {
      setHighlightId(null);
    }
  }, [searchedId, items]);

  useEffect(() => {
    if (highlightRowRef.current && highlightId) {
      highlightRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId]);

  const deleteMutation = useDeleteSupportTemplate();

  const openCreate = () => router.push("/communication/support-templates/new");
  const openEdit = (template: SupportTemplateItem) => router.push(`/communication/support-templates/${template.id}/edit`);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-1.5 items-center">
          <Button
            variant={categoryFilter === "all" ? "default" : "secondary"}
            size="sm"
            onClick={() => handleSetCategoryFilter("all")}
            className="gap-1.5"
          >
            Все
            <Badge variant="secondary" className="text-[10px] h-5 px-1">{counts?.total ?? 0}</Badge>
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={categoryFilter === String(cat.id) ? "default" : "secondary"}
              size="sm"
              onClick={() => handleSetCategoryFilter(String(cat.id))}
              className="gap-1.5"
            >
              {cat.name}
              <Badge variant="secondary" className="text-[10px] h-5 px-1">{counts?.categories?.[cat.id] ?? 0}</Badge>
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-muted-foreground">
              <X className="w-4 h-4" /> Сбросить
            </Button>
          )}
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Создать шаблон
          </Button>
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
              <button onClick={() => { setSearch(""); setDebouncedSearch(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <Table className="table-fixed w-full min-w-225">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-14">ID</TableHead>
                <TableHead className="w-40">Категория</TableHead>
                <TableHead className="w-50">Название</TableHead>
                <TableHead>Текст (превью)</TableHead>
                <TableHead className="w-30">Создано</TableHead>
                <TableHead className="w-30">Обновлено</TableHead>
                <TableHead className="w-22.5 text-center">Статус</TableHead>
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
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle className="w-16 h-16 text-destructive/50" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Не удалось загрузить шаблоны</p>
                      <p className="text-xs text-muted-foreground mt-1">{extractErrorMessage(error, "Проверьте соединение")}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
                      <Loader2 className="w-4 h-4 mr-2" /> Повторить
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : showEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="h-64 text-center text-muted-foreground animate-in fade-in duration-300">
                  <div className="flex flex-col items-center gap-3">
                    <FileSearch className="w-16 h-16 opacity-25" />
                    <p className="text-sm font-medium">Шаблонов не найдено.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((template, index) => {
                const isHighlighted = template.id === highlightId;
                return (
                  <TableRow
                    key={template.id}
                    ref={isHighlighted ? highlightRowRef : undefined}
                    className={`${isHighlighted ? "bg-blue-50 dark:bg-blue-950/40" : ""} animate-in fade-in slide-in-from-bottom-1 duration-300`}
                    style={{ animationDelay: `${Math.min(index * 15, 400)}ms`, animationFillMode: "backwards" }}
                  >
                    <TableCell className={`text-xs font-mono whitespace-nowrap tabular-nums align-top pt-3 ${isHighlighted ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      #{template.id}
                    </TableCell>
                    <TableCell className="align-top pt-3">
                      {template.category ? (
                        <Badge variant="secondary" className="text-[10px]">{template.category.name}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Удалена</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top pt-3">
                      <button onClick={() => openEdit(template)} className="text-left font-medium text-sm cursor-pointer hover:underline hover:text-primary transition-colors">
                        {template.title}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate align-top pt-3 max-w-xs">
                      {stripMarkdown(template.body).slice(0, 180)}
                    </TableCell>
                    {/* Создано */}
                    <TableCell className="align-top pt-3 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {template.created_at ? formatDate(template.created_at) : "—"}
                    </TableCell>
                    {/* Обновлено — жёлтым, если есть последнее действие */}
                    <TableCell className="align-top pt-3 text-xs whitespace-nowrap tabular-nums">
                      {template.updated_at && template.created_at && template.updated_at !== template.created_at ? (
                        <span className="text-amber-600 dark:text-amber-500">
                          {formatDate(template.updated_at)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center align-top pt-3">
                      {template.is_active ? (
                        <Badge variant="success" className="text-[10px]">Активен</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Выкл</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right align-top pt-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(template)} title="Редактировать">
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(template)} title="Удалить">
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

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Удалить шаблон?"
        description={deleteTarget ? `«${deleteTarget.title}» будет удалён навсегда.` : ""}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}

