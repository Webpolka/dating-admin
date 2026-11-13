// app/(admin)/system/blog/posts/_components/posts-table-client.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useBlogPostsList,
  useBlogPostCounts,
  useDeleteBlogPost,
  useDuplicateBlogPost,
  useToggleBlogPostStatus,
  useArchiveBlogPost,
  useRestoreBlogPost,
  useBulkBlogPosts,
  useSetFeaturedBlogPost,
  type BlogStatusFilter,
  type BulkBlogAction,
  type BlogPostList,
} from "@/hooks/admin/use-blog-posts";
import { extractErrorMessage } from "@/lib/api";
import { getInitialUrlParam } from "@/lib/url-params";
import { formatDateTime } from "@/lib/format";
import { getStatusBadge, BLOG_POST_STATUS } from "@/config/status-badges";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Newspaper, Plus, Search, X, Image as ImageIcon,
  Loader2, Pin,
} from "lucide-react";
import { SEARCH_DEBOUNCE_MS, PER_PAGE, STATUS_FILTERS, BULK_ACTION_LABELS } from "./_shared";
import { PostRowActions } from "./post-row-actions";
import { ListPagination } from "@/components/admin/list-pagination";

export function PostsTableClient() {
  const router = useRouter();

  // F2: initial state через getInitialUrlParam (после mount).
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BlogStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkAction, setBulkAction] = useState<BulkBlogAction | "">("");

  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BlogPostList | null>(null);

  const [urlInitialized, setUrlInitialized] = useState(false);
  const highlightRowRef = useRef<HTMLTableRowElement>(null);

  // Initial URL read.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(getInitialUrlParam("q"));
    setDebouncedSearch(getInitialUrlParam("q"));
    const urlStatus = getInitialUrlParam("status") as BlogStatusFilter;
    if (urlStatus && ["all", "published", "draft", "archived", "uncategorized"].includes(urlStatus)) {
      setStatusFilter(urlStatus);
    }
    setPage(parseInt(getInitialUrlParam("page") || "1", 10));
    setUrlInitialized(true);
  }, []);

  // URL-sync.
  useEffect(() => {
    if (!urlInitialized) return;
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [search, statusFilter, page, router, urlInitialized]);

  // F4: debounce 400ms.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);

      if (search && /^\d+$/.test(search)) {
        setStatusFilter("all");
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const { data: countsData } = useBlogPostCounts();
  const counts = countsData?.data;

  const { data, isLoading, isFetching, isError, error, refetch } = useBlogPostsList({
    q: debouncedSearch,
    status: statusFilter,
    page,
    per_page: PER_PAGE,
  });

  const deleteMutation = useDeleteBlogPost();
  const duplicateMutation = useDuplicateBlogPost();
  const toggleMutation = useToggleBlogPostStatus();
  const archiveMutation = useArchiveBlogPost();
  const restoreMutation = useRestoreBlogPost();
  const bulkMutation = useBulkBlogPosts();
  const featureMutation = useSetFeaturedBlogPost();

  const posts: BlogPostList[] = useMemo(() => data?.data ?? [], [data]);

  const meta = data?.meta;
  // F7: isHighlightedId от debouncedSearch, не от search.
  // Раньше подсветка срабатывала до debounce (когда пост ещё не найден).
  const isHighlightedId = debouncedSearch && /^\d+$/.test(debouncedSearch)
    ? parseInt(debouncedSearch, 10)
    : null;

  useEffect(() => {
    if (highlightRowRef.current && isHighlightedId) {
      highlightRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlightedId, posts]);

  const isFirstLoad = isLoading && !data;
  const isRefetching = isFetching && !isFirstLoad;
  const showEmpty = !isLoading && !isFetching && posts.length === 0 && !isError;

  const handleStatusFilterChange = (newStatus: BlogStatusFilter) => {
    setStatusFilter(newStatus);
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelected(checked ? posts.map((p) => String(p.id)) : []);
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
  };

  const handleApplyBulkClick = () => {
    if (!bulkAction || selected.length === 0) return;
    setBulkConfirmOpen(true);
  };

  const handleConfirmBulk = () => {
    if (!bulkAction || selected.length === 0) return;
    bulkMutation.mutate(
      {
        ids: selected.map((s) => parseInt(s, 10)),
        action: bulkAction,
        is_archive_tab: statusFilter === "archived",
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

  const handleConfirmDeletePost = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const handleDuplicate = (post: BlogPostList) => {
    duplicateMutation.mutate(post.id, {
      onSuccess: (newPost) => {
        if (newPost?.id) {
          router.push(`/system/blog/posts/${newPost.id}/edit`);
        }
      },
    });
  };

  const handleToggleFeatured = (post: BlogPostList) => {
    featureMutation.mutate(post.id);
  };

  const bulkActionLabel = bulkAction ? BULK_ACTION_LABELS[bulkAction] : null;
  const hasSelection = selected.length > 0;
  const isBulkDeleteWrongTab = bulkAction === "delete" && statusFilter !== "archived";

  const bulkConfirmTitle = isBulkDeleteWrongTab ? "Действие недоступно" : "Подтвердите действие";
  const bulkConfirmDescription = isBulkDeleteWrongTab
    ? 'Удалять посты можно только из вкладки «В архиве». Перейдите на нужную вкладку и повторите.'
    : `Применить «${bulkAction ? BULK_ACTION_LABELS[bulkAction] : ""}» к ${selected.length} постам?`;
  const bulkConfirmButton = isBulkDeleteWrongTab ? "Понятно" : "Применить";

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2 items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Newspaper className="w-6 h-6" />
            Записи блога
          </h1>
        </div>

        <Button onClick={() => router.push("/system/blog/posts/new")}>
          <Plus className="w-4 h-4" />
          Написать пост
        </Button>
      </div>

      {/* Filters + Bulk Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => {
            const count = counts ? counts[f.countKey] : undefined;
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
                onValueChange={(v: string | null) => setBulkAction((v ?? "") as BulkBlogAction | "")}
              >
                <SelectTrigger className="w-50">
                  {bulkActionLabel ? (
                    <span>{bulkActionLabel}</span>
                  ) : (
                    <span className="text-muted-foreground">Выберите действие...</span>
                  )}
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value="publish">Опубликовать</SelectItem>
                  <SelectItem value="draft">В черновики</SelectItem>
                  <SelectItem value="archive">В архив</SelectItem>
                  {statusFilter === "archived" && (
                    <SelectItem value="delete" className="text-destructive focus:text-destructive">
                      Удалить навсегда
                    </SelectItem>
                  )}
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
              <TableHead className="w-10">ID</TableHead>
              <TableHead className="w-22">Обложка</TableHead>
              <TableHead>Заголовок</TableHead>
              <TableHead>Рубрика</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Создан</TableHead>
              <TableHead>Обновлено</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isFirstLoad ? (
              <TableRow>
                <TableCell colSpan={9} className="py-16">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ) : isError ? (
              // F5: отдельная ветка ошибки загрузки.
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={9} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-16 h-16 text-destructive/50" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Не удалось загрузить посты</p>
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
                <TableCell colSpan={9} className="h-64 text-center text-muted-foreground animate-in fade-in duration-300">
                  <div className="flex flex-col items-center gap-3">
                    <Newspaper className="w-16 h-16 opacity-25" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Посты не найдены</p>
                      <p className="text-xs text-muted-foreground">
                        Попробуйте изменить фильтр или поисковый запрос
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post, index) => {
                const isHighlighted = post.id === isHighlightedId;
                const isSelected = selected.includes(String(post.id));

                const rowClassName = [
                  isHighlighted ? "bg-blue-50 dark:bg-blue-950/40 " : "",
                  !isHighlighted && isSelected ? "bg-muted/30" : "",
                  !isHighlighted && !isSelected && post.is_featured ? "bg-yellow-500/5" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                const statusBadge = getStatusBadge(BLOG_POST_STATUS, post.status);

                return (
                  <TableRow
                    key={post.id}
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
                        onCheckedChange={(c) => handleSelectOne(post.id, Boolean(c))}
                      />
                    </TableCell>
                    <TableCell className={`text-xs font-mono whitespace-nowrap ${isHighlighted ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      #{post.id}
                    </TableCell>
                    <TableCell>
                      {post.cover_thumb ? (
                        <div className="w-16 h-9 rounded-[0.25rem] overflow-hidden bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={post.cover_thumb} alt="Cover" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-9 rounded-[0.25rem] bg-muted flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-48 md:max-w-88">
                        {post.is_featured && (
                          <span className="shrink-0 text-yellow-500" title="Закрепленный пост">
                            <Pin className="w-4 h-4" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => router.push(`/system/blog/posts/${post.id}/edit`)}
                            className="flex items-center gap-1 font-medium text-sm hover:text-primary hover:underline text-left"
                          >
                            <span className="truncate">{post.title}</span>
                          </button>
                          {post.excerpt && (
                            <div className="truncate text-xs text-muted-foreground mt-0.5">{post.excerpt}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {post.category ? (
                        <Badge variant="outline">{post.category.name}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Без рубрики</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
                      {formatDateTime(post.created_at)}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap tabular-nums">
                      {post.updated_at && post.created_at && post.updated_at !== post.created_at ? (
                        <span className="text-amber-600 dark:text-amber-500">
                          {formatDateTime(post.updated_at)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <PostRowActions
                        post={post}
                        onEdit={() => router.push(`/system/blog/posts/${post.id}/edit`)}
                        onDuplicate={() => handleDuplicate(post)}
                        onToggleFeatured={() => handleToggleFeatured(post)}
                        onToggleStatus={() => toggleMutation.mutate(post.id)}
                        onArchive={() => archiveMutation.mutate(post.id)}
                        onRestore={() => restoreMutation.mutate(post.id)}
                        onDelete={() => setDeleteTarget(post)}
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
        onOpenChange={(open) => {
          setBulkConfirmOpen(open);
          if (!open && isBulkDeleteWrongTab) {
            setBulkAction("");
          }
        }}
        title={bulkConfirmTitle}
        description={bulkConfirmDescription}
        confirmText={bulkConfirmButton}
        cancelText={isBulkDeleteWrongTab ? "Закрыть" : "Отмена"}
        variant={bulkAction === "delete" ? "destructive" : "default"}
        isLoading={bulkMutation.isPending}
        onConfirm={
          isBulkDeleteWrongTab
            ? () => {
                setBulkConfirmOpen(false);
                setBulkAction("");
              }
            : handleConfirmBulk
        }
      />

      {/* Confirm: Delete Single */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Удалить пост навсегда?"
        description={
          deleteTarget
            ? `Пост «${deleteTarget.title}» будет удалён без возможности восстановления.`
            : undefined
        }
        confirmText="Удалить"
        cancelText="Отмена"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDeletePost}
      />
    </div>
  );
}

