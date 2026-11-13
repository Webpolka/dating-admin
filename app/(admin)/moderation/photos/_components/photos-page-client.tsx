// app/(admin)/moderation/photos/_components/photos-page-client.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhotoProvider } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";

import {
  usePhotosList,
  usePhotoCounts,
  type PhotoItem,
  type UserCard,
} from "@/hooks/admin/use-photos";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Loader2, CheckCircle } from "lucide-react";

import { PhotoCard } from "./photo-card";
import { UserPendingCard } from "./user-pending-card";
import { RejectModal } from "./reject-modal";
import { STATUS_TABS, SEARCH_DEBOUNCE_MS } from "./photos-shared";
import { ListPagination } from "@/components/admin/list-pagination";
import { PageHeader } from "@/components/admin/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { StatusTabs } from "@/components/admin/status-tabs";

export function PhotosPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get("status") ?? "pending"
  );
  const [page, setPage] = useState(parseInt(searchParams.get("page") ?? "1", 10));

  const [rejectTarget, setRejectTarget] = useState<PhotoItem | null>(null);

  // 🔑 Ключевой фикс: запоминаем, какой статус юзер ЗАПРОСИЛ (кликнул в табе).
  // Это позволяет отличить «бэкенд авто-сменил статус при поиске по ID»
  // от «юзер кликнул таб». Без этого — петля в useEffect.
  const requestedStatusRef = useRef<string>(statusFilter);

  // URL sync — БЕЗ router в зависимостях (он стабилен от Next.js)
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter !== "pending") params.set("status", statusFilter);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [search, statusFilter, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching, refetch } = usePhotosList({
    status: statusFilter as "pending" | "approved" | "rejected" | "quarantine",
    q: debouncedSearch,
    page,
  });

  // Авто-detect статуса: ТОЛЬКО когда бэкенд вернул ДРУГОЙ статус,
  // и ТОЛЬКО если это произошло из-за поиска по ID (не из-за клика на таб).
  // Если юзер сам кликнул таб — requestedStatusRef уже обновлён, и мы не вмешиваемся.
  useEffect(() => {
    if (!data?.status) return;

    if (data.status !== requestedStatusRef.current) {
      // Бэкенд вернул другой статус (фото в другом табе при поиске по ID)
      requestedStatusRef.current = data.status;
      setStatusFilter(data.status);
    }
  }, [data?.status]);

  const items = useMemo(() => (data?.data ?? []) as UserCard[] | PhotoItem[], [data]);
  const meta = data?.meta;
  // Counts — из отдельного stable query (не зависит от filter/search/page).
  // Раньше брали из data?.stats — но data пересоздавалась при смене вкладок,
  // и counts на момент fetch показывали 0 → скачкообразный UI.
  const { data: countsData } = usePhotoCounts();
  const stats = countsData?.stats;
  const mode = data?.mode ?? "queue";

  const isFirstLoad = isLoading && !data;
  const showEmpty = !isLoading && !isFetching && items.length === 0;

  const isIdSearch = debouncedSearch !== "" && /^\d+$/.test(debouncedSearch);
  const searchedId = isIdSearch ? parseInt(debouncedSearch, 10) : null;

  const handleSetStatus = (status: string) => {
    // Фиксируем, что юзер сам выбрал этот статус
    requestedStatusRef.current = status;
    setStatusFilter(status);
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const handleResetFilters = () => {
    requestedStatusRef.current = "pending";
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("pending");
    setPage(1);
  };

  const hasFilters = search !== "" || statusFilter !== "pending";

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Шапка */}
      <PageHeader
        icon={ImageIcon}
        title="Модерация фотографий"
        description="Проверка пользовательских фото"
        onBack={() => router.back()}
        onRefresh={refetch}
        isFetching={isFetching}
      />

      {/* Табы + Поиск */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <StatusTabs
          tabs={STATUS_TABS}
          value={statusFilter}
          onChange={handleSetStatus}
          getCount={(v) => (stats as Record<string, number> | undefined)?.[v]}
        />

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="ID фото, ID юзера или имя..."
        />
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
              {hasFilters ? "Ничего не найдено" : "Очередь пуста!"}
            </h3>
            <p className="text-muted-foreground mt-1">
              {hasFilters ? "Попробуйте изменить поисковый запрос" : "Все фотографии проверены."}
            </p>
            {hasFilters && (
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-4">
                Сбросить фильтры
              </Button>
            )}
          </div>
        ) : mode === "queue" ? (
          <div className="space-y-6">
            {(items as UserCard[]).map((user) => (
              <UserPendingCard
                key={user.id}
                user={user}
                searchedId={searchedId}
                onReject={(photo) => setRejectTarget(photo)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {(items as PhotoItem[]).map((photo, i) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                isHighlighted={photo.id === searchedId}
                onReject={(p) => setRejectTarget(p)}
                index={i}
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

      {/* Модалка отклонения */}
      <RejectModal
        photo={rejectTarget}
        onOpenChange={(open) => { if (!open) setRejectTarget(null); }}
      />
    </div>
  );
}
