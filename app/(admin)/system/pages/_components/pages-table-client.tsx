// app/(admin)/system/pages/_components/pages-table-client.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "cn";
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuGroup, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import {
  ArrowLeft, FileText, Plus, Search, X, MoreHorizontal, Pencil, Copy,
  Trash2, FileX, Send, FileEdit, Loader2, AlertCircle,
} from "lucide-react";
import { pagesApi, type PageListItem } from "@/lib/api/pages";
import { extractErrorMessage } from "@/lib/api";
import { getInitialUrlParam } from "@/lib/url-params";
import { formatDateTime } from "@/lib/format";
import { getStatusBadge, PAGE_STATUS } from "@/config/status-badges";
import { SEARCH_DEBOUNCE_MS, PER_PAGE, STATUS_FILTERS, BULK_ACTION_LABELS } from "./_shared";

export function PagesTableClient() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const [urlInitialized, setUrlInitialized] = useState(false);
  const highlightedRowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(getInitialUrlParam("q"));
    setDebouncedSearch(getInitialUrlParam("q"));
    const urlStatus = getInitialUrlParam("status");
    if (urlStatus && ["all", "active", "draft"].includes(urlStatus)) {
      setStatusFilter(urlStatus);
    }
    const urlPage = parseInt(getInitialUrlParam("page") || "1", 10);
    if (!isNaN(urlPage) && urlPage > 0) setPage(urlPage);
    setUrlInitialized(true);
  }, []);

  useEffect(() => {
    if (!urlInitialized) return;
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [search, statusFilter, page, router, urlInitialized]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      if (search && /^\d+$/.test(search)) {
        setStatusFilter("all");
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handler);
  }, [search]);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["pages", page, debouncedSearch, statusFilter],
    queryFn: () => pagesApi.getPages({
      search: debouncedSearch,
      status: statusFilter,
      page,
      per_page: PER_PAGE,
    }),
    placeholderData: (prev) => prev,
    staleTime: 0,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => pagesApi.toggleStatus(id),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries({ queryKey: ["pages"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка смены статуса")),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: number) => pagesApi.duplicate(id),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries({ queryKey: ["pages"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка дублирования")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => pagesApi.delete(id),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      setDeleteId(null);
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка удаления")),
  });

  const bulkMutation = useMutation({
    mutationFn: () => pagesApi.bulkAction(selected, bulkAction),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      setSelected([]);
      setSelectAll(false);
      setBulkAction("");
      setBulkConfirmOpen(false);
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка массового действия")),
  });

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked && data?.pages) {
      setSelected(data.pages.map((p: PageListItem) => p.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelected([...selected, id]);
    } else {
      setSelected(selected.filter((s) => s !== id));
      setSelectAll(false);
    }
  };

  const handleApplyBulkClick = () => {
    if (selected.length === 0 || !bulkAction) return;
    setBulkConfirmOpen(true);
  };

  const handleConfirmBulk = () => {
    if (selected.length === 0 || !bulkAction) return;
    bulkMutation.mutate();
  };

  const handleClearSelection = () => {
    setSelected([]);
    setSelectAll(false);
    setBulkAction("");
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const isIdSearch = debouncedSearch !== "" && /^\d+$/.test(debouncedSearch);
  const highlightedId = isIdSearch ? parseInt(debouncedSearch, 10) : null;

  useEffect(() => {
    if (highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedId, data]);

  const hasSelection = selected.length > 0;
  const bulkActionLabel = bulkAction ? BULK_ACTION_LABELS[bulkAction] : null;

  const isFirstLoad = isLoading && !data;
  const isRefetching = isFetching && !isFirstLoad;
  const showEmpty = !isLoading && !isFetching && (!data?.pages || data.pages.length === 0) && !isError;

  const lastPage = data?.last_page || 1;
  const currentPage = data?.current_page || 1;

  const renderPaginationItems = () => {
    const items = [];
    const maxPagesToShow = 5;

    if (lastPage <= 1) return null;

    items.push(
      <PaginationItem key="prev">
        <PaginationPrevious
          href="#"
          onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(p - 1, 1)); }}
          aria-disabled={currentPage === 1}
          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
        />
      </PaginationItem>
    );

    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(lastPage, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (startPage > 1) {
      items.push(
        <PaginationItem key="1">
          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setPage(1); }} isActive={1 === currentPage}>1</PaginationLink>
        </PaginationItem>
      );
      if (startPage > 2) {
        items.push(<PaginationEllipsis key="ellipsis-start" />);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            onClick={(e) => { e.preventDefault(); setPage(i); }}
            isActive={i === currentPage}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (endPage < lastPage) {
      if (endPage < lastPage - 1) {
        items.push(<PaginationEllipsis key="ellipsis-end" />);
      }
      items.push(
        <PaginationItem key={lastPage}>
          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setPage(lastPage); }} isActive={lastPage === currentPage}>{lastPage}</PaginationLink>
        </PaginationItem>
      );
    }

    items.push(
      <PaginationItem key="next">
        <PaginationNext
          href="#"
          onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(p + 1, lastPage)); }}
          aria-disabled={currentPage === lastPage}
          className={currentPage === lastPage ? "pointer-events-none opacity-50" : ""}
        />
      </PaginationItem>
    );

    return items;
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Страницы
          </h1>
        </div>

        <Link href="/system/pages/create">
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Создать страницу
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => {
            const count = data?.counts ? (data.counts as Record<string, number>)[f.countKey] : undefined;
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

        <div className="flex items-center gap-5">
          {hasSelection && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium whitespace-nowrap">
                Выбрано: <span className="text-primary">{selected.length}</span>
              </span>
              <div className="w-px h-6 bg-border" />
              <Select
                value={bulkAction}
                onValueChange={(value: string | null) => {
                  if (value) setBulkAction(value);
                }}
              >
                <SelectTrigger className="w-50">
                  {bulkActionLabel ? (
                    <span>{bulkActionLabel}</span>
                  ) : (
                    <span className="text-muted-foreground">Выберите действие...</span>
                  )}
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value="activate">Опубликовать</SelectItem>
                  <SelectItem value="draft">Снять с публикации</SelectItem>
                  <SelectItem value="delete">Удалить</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleApplyBulkClick}
                disabled={!bulkAction || bulkMutation.isPending}
              >
                {bulkMutation.isPending ? "Применяется..." : "Применить"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                <X className="w-4 h-4" /> Снять
              </Button>
            </div>
          )}

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Поиск по названию или id..."
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
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden relative">
        {isRefetching && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-[2px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={(checked) => handleSelectAll(checked === true)}
                  />
                </TableHead>
                <TableHead className="w-10">ID</TableHead>
                <TableHead>Заголовок</TableHead>
                <TableHead>URL (Slug)</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Создано</TableHead>
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
                      <AlertCircle className="w-16 h-16 text-destructive/50" />
                      <div>
                        <p className="text-sm font-medium text-destructive">Не удалось загрузить страницы</p>
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
                      <FileX className="w-16 h-16 opacity-25" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Страницы не найдены</p>
                        <p className="text-xs text-muted-foreground">
                          Попробуйте изменить фильтр или поисковый запрос
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data?.pages?.map((p: PageListItem, index: number) => {
                  const isHighlighted = p.id === highlightedId;
                  const isSelected = selected.includes(p.id);

                  const rowClassName = cn(
                    isHighlighted && "bg-blue-50 dark:bg-blue-950/40",
                    !isHighlighted && isSelected && "bg-muted/30",
                  );

                  const statusKey = p.is_active ? "active" : "draft";
                  const statusBadge = getStatusBadge(PAGE_STATUS, statusKey);

                  return (
                    <TableRow
                      key={p.id}
                      ref={isHighlighted ? highlightedRowRef : undefined}
                      className={cn(
                        rowClassName,
                        "animate-in fade-in slide-in-from-bottom-1 duration-300"
                      )}
                      style={{
                        animationDelay: `${Math.min(index * 30, 400)}ms`,
                        animationFillMode: 'backwards',
                      }}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectOne(p.id, checked === true)}
                        />
                      </TableCell>
                      <TableCell className={cn(
                        "text-xs font-mono whitespace-nowrap tabular-nums",
                        isHighlighted ? "text-primary font-bold" : "text-muted-foreground"
                      )}>
                        #{p.id}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-48 md:max-w-88">
                          <Link
                            href={`/system/pages/${p.id}/edit`}
                            className="block truncate font-medium text-sm hover:text-primary hover:underline"
                          >
                            {p.title}
                          </Link>
                          {p.meta_description && (
                            <div className="truncate text-xs text-muted-foreground mt-0.5">{p.meta_description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs px-1.5 py-0.5 bg-muted rounded">/{p.slug}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                      </TableCell>
                      {/* Создано */}
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
                        {p.created_at ? formatDateTime(p.created_at) : "—"}
                      </TableCell>
                      {/* Обновлено — жёлтым, если есть последнее действие */}
                      <TableCell className="text-xs whitespace-nowrap tabular-nums">
                        {p.updated_at && p.created_at && p.updated_at !== p.created_at ? (
                          <span className="text-amber-600 dark:text-amber-500">
                            {formatDateTime(p.updated_at)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          }/>
                          <DropdownMenuContent align="end" className="min-w-42">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Действия</DropdownMenuLabel>
                              <DropdownMenuItem render={
                                <Link href={`/system/pages/${p.id}/edit`} className="cursor-pointer">
                                  <Pencil className="w-4 h-4 mr-2" /> Редактировать
                                </Link>
                              }/>
                              <DropdownMenuItem onClick={() => duplicateMutation.mutate(p.id)}>
                                <Copy className="w-4 h-4 mr-2" /> Дублировать
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {p.is_active ? (
                                <DropdownMenuItem onClick={() => toggleMutation.mutate(p.id)}>
                                  <FileEdit className="w-4 h-4 mr-2" /> В черновики
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => toggleMutation.mutate(p.id)}>
                                  <Send className="w-4 h-4 mr-2" /> Опубликовать
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteId(p.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Удалить
                              </DropdownMenuItem>
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
      </div>

      {data && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-muted-foreground tabular-nums">
            Показано {data.pages.length} из {data.total} страниц
          </div>
          {lastPage > 1 && (
            <Pagination className="justify-end">
              <PaginationContent>
                {renderPaginationItems()}
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}

      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите действие</AlertDialogTitle>
            <AlertDialogDescription>
              {`Применить «${bulkAction ? BULK_ACTION_LABELS[bulkAction] : ""}» к ${selected.length} страницам?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkMutation.isPending}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmBulk();
              }}
              disabled={bulkMutation.isPending}
              className={bulkAction === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {bulkMutation.isPending ? "Применяется..." : "Применить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить страницу?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Страница будет удалена навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Удаление..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}