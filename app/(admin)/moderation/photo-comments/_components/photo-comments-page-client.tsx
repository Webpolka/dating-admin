// app/(admin)/moderation/photo-comments/_components/photo-comments-page-client.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhotoProvider } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";

import {
  usePhotoCommentsList,
  usePhotoCommentCounts,
  useApproveAllPendingComments,
  useRejectAllPendingComments,
  type PhotoWithComments,
} from "@/hooks/admin/use-photo-comments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  ArrowLeft, MessageCircle, Search, X, Loader2, RefreshCw, CheckCircle, XCircle
} from "lucide-react";

import { PhotoWithCommentsCard } from "./photo-with-comments-card";
import { STATUS_TABS, SEARCH_DEBOUNCE_MS } from "./photo-comments-shared";
import { ListPagination } from "@/components/admin/list-pagination";
import { StatusTabs } from "@/components/admin/status-tabs";

export function PhotoCommentsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get("status") ?? "pending"
  );
  const [page, setPage] = useState(parseInt(searchParams.get("page") ?? "1", 10));

  const [showApproveAll, setShowApproveAll] = useState(false);
  const [showRejectAll, setShowRejectAll] = useState(false);

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter !== "pending") params.set("status", statusFilter);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [search, statusFilter, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Поиск: debounce + моментальный сброс status на "all".
  // При вводе текста → сразу переключаемся на "Все" статус
  // (искомый ID/слово может быть в любом статусе — pending/approved/rejected).
  // Сброс идёт НЕ внутри debounce timer → нет задержки.
  useEffect(() => {
    if (search !== "") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatusFilter("all");
    }
    setPage(1);
    const t = setTimeout(() => {
      setDebouncedSearch(search);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching, refetch } = usePhotoCommentsList({
    status: statusFilter as "all" | "pending" | "approved" | "rejected" | "karantine",
    q: debouncedSearch,
    page,
  });

  const approveAllMutation = useApproveAllPendingComments();
  const rejectAllMutation = useRejectAllPendingComments();

  const items = useMemo(() => (data?.data ?? []) as PhotoWithComments[], [data]);
  const meta = data?.meta;
  // Counts — из отдельного stable query (не зависит от filter/search/page).
  // Раньше брали из data?.stats — скачкообразный UI при смене вкладок.
  const { data: countsData } = usePhotoCommentCounts();
  const stats = countsData?.stats;

  const isFirstLoad = isLoading && !data;
  const showEmpty = !isLoading && !isFetching && items.length === 0;

  const isIdSearch = debouncedSearch !== "" && /^\d+$/.test(debouncedSearch);
  const searchedId = isIdSearch ? parseInt(debouncedSearch, 10) : null;

  const handleSetStatus = (status: string) => {
    setStatusFilter(status);
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("pending");
    setPage(1);
  };

  const hasFilters = search !== "" || statusFilter !== "pending";
  const pendingTotal = stats?.pending ?? 0;

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
              <MessageCircle className="w-6 h-6" />
              Модерация комментариев
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

        <div className="flex items-center gap-2">
          {pendingTotal > 0 && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowApproveAll(true)}
                disabled={approveAllMutation.isPending || rejectAllMutation.isPending}
              >
                {approveAllMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-1" />
                )}
                Одобрить все
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowRejectAll(true)}
                disabled={approveAllMutation.isPending || rejectAllMutation.isPending}
              >
                {rejectAllMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <XCircle className="w-4 h-4 mr-1" />
                )}
                Отклонить все
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Табы + Поиск */}
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

      {/* Контент */}
      <PhotoProvider>
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
            {items.map((photo) => (
              <PhotoWithCommentsCard
                key={photo.id}
                photo={photo}
                searchedId={searchedId}
                statusFilter={statusFilter}
                isKarantine={statusFilter === "karantine"}
              />
            ))}
          </div>
        )}
      </PhotoProvider>

      <ListPagination
        currentPage={page}
        lastPage={meta?.last_page ?? 1}
        from={meta?.from ?? null}
        to={meta?.to ?? null}
        total={meta?.total}
        onChangePage={setPage}
        disabled={isFetching}
      />

      {/* ConfirmDialog — одобрить все */}
      <ConfirmDialog
        open={showApproveAll}
        onOpenChange={(open) => { if (!open) setShowApproveAll(false); }}
        title="Одобрить все комментарии?"
        description={`Вы уверены? Будут одобрены все ${pendingTotal} ожидающих комментариев.`}
        confirmText="Одобрить все"
        cancelText="Отмена"
        variant="default"
        isLoading={approveAllMutation.isPending}
        onConfirm={() => {
          approveAllMutation.mutate(undefined, {
            // onSuccess — диалог закрывается ТОЛЬКО при успехе.
            // При ошибке остаётся открытым, модератор видит toast и может retry.
            onSuccess: () => setShowApproveAll(false),
          });
        }}
      />

      {/* ConfirmDialog — отклонить все */}
      <ConfirmDialog
        open={showRejectAll}
        onOpenChange={(open) => { if (!open) setShowRejectAll(false); }}
        title="Отклонить все комментарии?"
        description={`Вы уверены? Будут отклонены все ${pendingTotal} ожидающих комментариев. Это действие нельзя отменить.`}
        confirmText="Отклонить все"
        cancelText="Отмена"
        variant="destructive"
        isLoading={rejectAllMutation.isPending}
        onConfirm={() => {
          rejectAllMutation.mutate(undefined, {
            onSuccess: () => setShowRejectAll(false),
          });
        }}
      />
    </div>
  );
}