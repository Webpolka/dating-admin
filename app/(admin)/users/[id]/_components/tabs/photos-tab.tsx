"use client";

// app/(admin)/users/[id]/_components/tabs/photos-tab.tsx
//
// Таб «Фото» на странице пользователя: список всех фото юзера,
// сгруппированных по статусу (pending/approved/rejected/quarantine).
//
// Архитектура (без велосипедов — переиспользуем существующее):
//   - Фото-карточки: PhotoCard из moderation/photos (с hideUserBadge=true,
//     т.к. юзер уже в шапке страницы — не дублируем).
//   - Модалка отклонения: RejectModal из moderation/photos (тот же Select
//     с PHOTO_REJECT_REASONS из lib/photos.ts).
//   - Галерея: react-photo-view (PhotoProvider оборачивает сетку —
//     клик по карточке открывает лайтбокс, как в глобальной модерации).
//   - Хук листинга: useUserPhotos (новый, в use-users.ts) — per-user
//     эндпоинт GET /admin/users/{userId}/photos?status=&page=.
//   - Хуки мутаций: useApprovePhoto/useRejectPhoto/useSetPrimaryPhoto/
//     useSoftDeletePhoto/useRestorePhoto/useDestroyPhoto/
//     useApproveAllForUser/useRejectAllForUser — все из use-photos.ts,
//     они же инвалидируют ["user-photos"] (патч ЧАСТИ 7).
//   - Массовые действия (Одобрить все / Отклонить все) — только в табе
//     pending, через ConfirmDialog (как в UserPendingCard).
//
// URL: ?status=pending&page=2 (как в reports-tab/blocks-tab — паттерн
// URL-пагинации через router.replace). Default status=pending — самое
// важное для модератора.

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { PhotoProvider } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";

import { Button } from "@/components/ui/button";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { TabLoading, TabError } from "@/components/admin/tab-states";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ImageOff, Loader2, Check, X } from "lucide-react";

import { useUserPhotos } from "@/hooks/admin/use-users";
import {
  useApproveAllForUser,
  useRejectAllForUser,
  type PhotoItem,
} from "@/hooks/admin/use-photos";
import type { UserPhotoStatus, UserPhotoCounts } from "@/lib/api/users";

// Переиспользуем карточку и модалку из глобальной модерации.
import { PhotoCard } from "@/app/(admin)/moderation/photos/_components/photo-card";
import { RejectModal } from "@/app/(admin)/moderation/photos/_components/reject-modal";
// STATUS_TABS — общий источник правды для статус-табов (иконки + цвета).
import { STATUS_TABS } from "@/app/(admin)/moderation/photos/_components/photos-shared";
import { StatusTabs } from "@/components/admin/status-tabs";

interface PhotosTabProps {
  userId: number;
}

export function PhotosTab({ userId }: PhotosTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL — единственный источник правды для status и page.
  // Default status=pending (как в глобальной модерации — самое важное).
  const statusParam = searchParams.get("status");
  const status: UserPhotoStatus =
    statusParam === "approved" ||
    statusParam === "rejected" ||
    statusParam === "quarantine"
      ? statusParam
      : "pending";
  const page = Number(searchParams.get("page") ?? "1") || 1;

  const { data, isLoading, isError, refetch } = useUserPhotos(
    userId,
    { status, page },
  );

  // Таргет для RejectModal (одна модалка на весь таб).
  const [rejectTarget, setRejectTarget] = useState<PhotoItem | null>(null);

  // Массовые действия — через ConfirmDialog (как в UserPendingCard).
  const [confirmApproveAll, setConfirmApproveAll] = useState(false);
  const [confirmRejectAll, setConfirmRejectAll] = useState(false);

  const approveAll = useApproveAllForUser();
  const rejectAll = useRejectAllForUser();

  /** Смена статуса: патчим только ?status (page сбрасываем до 1). */
  const setStatus = useCallback(
    (next: UserPhotoStatus) => {
      const params = new URLSearchParams();
      if (next !== "pending") params.set("status", next);
      // page=1 — default, не пишем в URL (как в reports-tab с page<=1).
      router.replace(`/users/${userId}/photos?${params.toString()}`, {
        scroll: false,
      });
    },
    [router, userId],
  );

  /** Смена страницы: патчим только ?page (status сохраняем). */
  const setPage = useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextPage <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(nextPage));
      }
      const qs = params.toString();
      router.replace(
        `/users/${userId}/photos${qs ? `?${qs}` : ""}`,
        { scroll: false },
      );
    },
    [router, searchParams, userId],
  );

  // --- Состояния загрузки/ошибки (как в reports-tab) ---
  if (isLoading) {
    return <TabLoading label="Загрузка фото..." />;
  }
  if (isError) {
    return <TabError label="Не удалось загрузить фото" onRetry={refetch} />;
  }
  if (!data) {
    return <TabLoading label="Загрузка фото..." />;
  }

  const paginator = data.data;
  const counts: UserPhotoCounts = data.counts;
  const photos = paginator.data;

  return (
    <div className="space-y-6">
      {/* === Шапка: статус-табы + массовые действия === */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <StatusTabs
          tabs={STATUS_TABS}
          value={status}
          onChange={setStatus}
          getCount={(v) => counts[v]}
        />

        {/* Массовые действия — только в pending-табе (в других статусах
            они не имеют смысла: одобрять уже одобренные — некуда). */}
        {status === "pending" && counts.pending > 0 && (
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setConfirmApproveAll(true)}
              disabled={approveAll.isPending}
            >
              {approveAll.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              Одобрить все ({counts.pending})
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmRejectAll(true)}
              disabled={rejectAll.isPending}
            >
              {rejectAll.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <X className="w-4 h-4 mr-1" />
              )}
              Отклонить все
            </Button>
          </div>
        )}
      </div>

      {/* === Сетка фото === */}
      {photos.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-16 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
            <ImageOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">Нет фото в этой категории</h3>
          <p className="text-muted-foreground mt-1">
            {status === "pending" && "Все фото пользователя проверены."}
            {status === "approved" && "У пользователя нет одобренных фото."}
            {status === "rejected" && "Нет отклонённых фото."}
            {status === "quarantine" && "Карантин пуст."}
          </p>
        </div>
      ) : (
        <PhotoProvider>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, i) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                index={i}
                hideUserBadge
                // Контекстный тип для фото — аватары делаем кликабельными
                // только в approved-табе (там setPrimary имеет смысл).
                // Pending-фото нельзя ставить аватаром — PhotoCard сам скрывает
                // эту кнопку (см. комментарий в photo-card.tsx).
                onReject={(p) => setRejectTarget(p)}
              />
            ))}
          </div>
        </PhotoProvider>
      )}

      {/* === Пагинация === */}
      {photos.length > 0 && (
        <MiniPagination
          currentPage={paginator.current_page}
          lastPage={paginator.last_page}
          from={paginator.from}
          to={paginator.to}
          total={paginator.total}
          onChangePage={setPage}
        />
      )}

      {/* === Модалка отклонения (одна на таб, как в photos-page-client) === */}
      <RejectModal
        photo={rejectTarget}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      />

      {/* === Подтверждение массового одобрения === */}
      <ConfirmDialog
        open={confirmApproveAll}
        onOpenChange={setConfirmApproveAll}
        title="Одобрить все pending-фото?"
        description={`Будут одобрены все фото в статусе «Ожидает» (${counts.pending} шт.). Запустится обработка (генерация WebP-вариантов). Пользователь получит одно уведомление.`}
        confirmText="Одобрить все"
        variant="default"
        isLoading={approveAll.isPending}
        onConfirm={() => {
          approveAll.mutate(userId, {
            onSettled: () => setConfirmApproveAll(false),
          });
        }}
      />

      {/* === Подтверждение массового отклонения === */}
      <ConfirmDialog
        open={confirmRejectAll}
        onOpenChange={setConfirmRejectAll}
        title="Отклонить все pending-фото?"
        description={`Все ${counts.pending} фото в статусе «Ожидает» будут отклонены с причиной «Другое». Если среди них был аватар — он будет автоматически переназначен на первое одобренное фото. Пользователь получит одно уведомление.`}
        confirmText="Отклонить все"
        variant="destructive"
        isLoading={rejectAll.isPending}
        onConfirm={() => {
          rejectAll.mutate(userId, {
            onSettled: () => setConfirmRejectAll(false),
          });
        }}
      />
    </div>
  );
}
