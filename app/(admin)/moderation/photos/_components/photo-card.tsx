// app/(admin)/moderation/photos/_components/photo-card.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { PhotoView } from "react-photo-view";
import { useRouter } from "next/navigation";
import { ImageOff } from "lucide-react";

import {
  useApprovePhoto,
  useSetPrimaryPhoto,
  useSoftDeletePhoto,
  useRestorePhoto,
  useDestroyPhoto,
  type PhotoItem,
  getRejectReasonLabel,
} from "@/hooks/admin/use-photos";
import { UserBadge } from "@/components/admin/user-badge";
import type { UserBadgeData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Loader2, Check, X, EyeOff, RotateCcw, Trash2, Star } from "lucide-react";
import { BADGE_BASE_CLASS } from "./photos-shared";

export function PhotoCard({
  photo,
  isHighlighted = false,
  onReject,
  hideUserBadge = false,
  index = 0,
}: {
  photo: PhotoItem;
  isHighlighted?: boolean;
  onReject: (photo: PhotoItem) => void;
  hideUserBadge?: boolean;
  /** Index in the grid — for cascade animation delay. */
  index?: number;
}) {
  const router = useRouter();
  const highlightRef = useRef<HTMLDivElement>(null);
  const [showDestroy, setShowDestroy] = useState(false);

  const approveMutation = useApprovePhoto();
  const setPrimaryMutation = useSetPrimaryPhoto();
  const softDeleteMutation = useSoftDeletePhoto();
  const restoreMutation = useRestorePhoto();
  const destroyMutation = useDestroyPhoto();

  useEffect(() => {
    if (isHighlighted && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  const status = photo.trashed ? "quarantine" : photo.status;
  const isPending =
    (approveMutation.isPending && approveMutation.variables === photo.id) ||
    (setPrimaryMutation.isPending && setPrimaryMutation.variables === photo.id) ||
    (softDeleteMutation.isPending && softDeleteMutation.variables === photo.id) ||
    (restoreMutation.isPending && restoreMutation.variables === photo.id) ||
    (destroyMutation.isPending && destroyMutation.variables === photo.id);

  // Cascade animation delay: 50ms per card, capped at 600ms (12 cards).
  // After 12 cards, no more stagger — they all appear together.
  const cascadeDelay = Math.min(index * 50, 600);

  return (
    <div
      ref={highlightRef}
      style={{ animationDelay: `${cascadeDelay}ms` }}
      className={`bg-card border border-border rounded-lg overflow-hidden flex flex-col transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both ${
        isHighlighted ? "ring-4 ring-blue-500 ring-offset-2 ring-offset-card" : ""
      }`}
    >
      {/* Превью */}
      <div className="relative aspect-square bg-muted group overflow-hidden">
        <PhotoView src={photo.original_url}>
          <button className="block w-full h-full cursor-zoom-in" type="button">
            <PhotoImage
              src={photo.medium_url || photo.original_url}
              alt="Фото"
              className={`absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                photo.trashed ? "opacity-50 grayscale" : ""
              }`}
            />
          </button>
        </PhotoView>

        {/* Правый верхний угол: звёздочка-аватар + #ID */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
          {photo.is_primary && (
            <span
              className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-purple-500 text-white shadow-md"
              title="Это аватар"
            >
              <Star className="w-4 h-4 fill-current" />
            </span>
          )}
          <span className="bg-black/70 text-white text-[11px] px-1.5 py-0.5 rounded font-medium">
            #{photo.id}
          </span>
        </div>

        {/* Левый верхний угол: 18+ и Альбом */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {photo.is_intimate && (
            <span className={`${BADGE_BASE_CLASS} inline-flex items-center rounded font-medium bg-red-600/80`}>
              18+
            </span>
          )}
          {photo.album && (
            <span className={`${BADGE_BASE_CLASS} inline-flex items-center rounded font-medium`}>
              {photo.album.name}
            </span>
          )}
        </div>

     {/* Причина отказа снизу — только для rejected (не trashed). */}
      {photo.status === "rejected" && photo.reject_reason && !photo.trashed && (
        <div className="absolute bottom-2 left-2 bg-red-600/90 text-white text-[11px] px-2 py-0.5 rounded font-medium">
          {getRejectReasonLabel(photo.reject_reason)}
        </div>
      )}

      {/* Бейдж «В карантине» — для trashed фото в любом табе.
          Особенно важен при поиске по ID, когда фото из карантина
          показывается с grayscale, но без явного бейджа непонятно, что оно в карантине. */}
      {photo.trashed && (
        <div className="absolute bottom-2 left-2 bg-blue-500/90 text-white text-[11px] px-2 py-0.5 rounded font-medium inline-flex items-center gap-1">
          <EyeOff className="w-3 h-3" />
          В карантине
        </div>
      )}
      </div>

      {/* Шапка с юзером — можно скрыть (hideUserBadge) для queue-режима */}
      {!hideUserBadge && (
        <div className="p-3 border-b border-border">
          {photo.user ? (
            <button
              onClick={() => router.push(`/users/${photo.user!.id}`)}
              className="block text-left w-full"
            >
              <UserBadge user={photo.user as unknown as UserBadgeData} size="sm" showEmail={true} />
            </button>
          ) : (
            <span className="text-xs text-muted-foreground italic">Юзер удален</span>
          )}
        </div>
      )}

      {/* Кнопки действий — зависят от статуса */}
      <div className="p-2 flex gap-2">
          {status === "pending" && (
          <>
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
              onClick={() => approveMutation.mutate(photo.id)}
              disabled={isPending}
            >
              {approveMutation.isPending && approveMutation.variables === photo.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Одобрить
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => onReject(photo)}
              disabled={isPending}
            >
              <X className="w-3.5 h-3.5" /> Отклонить
            </Button>
            {/* 🚨 Кнопка ⭐ убрана из pending — нельзя ставить аватаром неодобренное фото.
                Если фото уже is_primary (редкий случай при первой загрузке юзера),
                показываем только бейдж ⭐ в правом верхнем углу как индикатор. */}
          </>
        )}
        {status === "quarantine" && (
          <>
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => restoreMutation.mutate(photo.id)}
              disabled={isPending}
            >
              {restoreMutation.isPending && restoreMutation.variables === photo.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
              )}
              Вернуть
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => setShowDestroy(true)}
              disabled={isPending}
            >
              {destroyMutation.isPending && destroyMutation.variables === photo.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 mr-1" />
              )}
              Удалить
            </Button>
          </>
        )}

        {status === "approved" && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs text-destructive hover:bg-destructive/10"
              onClick={() => onReject(photo)}
              disabled={isPending}
            >
              <X className="w-3.5 h-3.5 mr-1" /> Отклонить
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={`h-8 w-8 ${
                photo.is_primary
                  ? "border-purple-500 text-purple-500 bg-purple-500/10"
                  : "text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10"
              }`}
              onClick={() => setPrimaryMutation.mutate(photo.id)}
              disabled={isPending || photo.is_primary}
              title={photo.is_primary ? "Это уже аватар" : "Сделать аватаром"}
            >
              {setPrimaryMutation.isPending && setPrimaryMutation.variables === photo.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : photo.is_primary ? (
                <Star className="w-3.5 h-3.5 fill-current text-purple-500" />
              ) : (
                <Star className="w-3.5 h-3.5" />
              )}
            </Button>
          </>
        )}

        {status === "rejected" && (
          <>
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => approveMutation.mutate(photo.id)}
              disabled={isPending}
            >
              {approveMutation.isPending && approveMutation.variables === photo.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <Check className="w-3.5 h-3.5 mr-1" />
              )}
              Одобрить
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => softDeleteMutation.mutate(photo.id)}
              disabled={isPending}
            >
              {softDeleteMutation.isPending && softDeleteMutation.variables === photo.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 mr-1" />
              )}
              Карантин
            </Button>
          </>
        )}
      </div>

      {/* Модалка подтверждения удаления */}
      <ConfirmDialog
        open={showDestroy}
        onOpenChange={(open) => { if (!open) setShowDestroy(false); }}
        title="Удалить фото навсегда?"
        description="Это действие необратимо. Фото будет удалено с диска без возможности восстановления."
        confirmText="Удалить навсегда"
        cancelText="Отмена"
        variant="destructive"
        isLoading={destroyMutation.isPending && destroyMutation.variables === photo.id}
       onConfirm={() => {
          destroyMutation.mutate(photo.id, {
            onSuccess: () => setShowDestroy(false),
          });
        }}
      />
    </div>
  );
}

// ============================================================
// Image с onError fallback — placeholder для битых картинок
// ============================================================
// Если URL broken / 404 / сеть упала / external URL заблокирован —
// показываем серую плашку с иконкой ImageOff в центре вместо
// broken image browser icon или alt-текста в углу.
//
// Состояние локальное (per-image) — при ошибке ставим hasError=true
// и рендерим fallback. loading="lazy" для lazy-loading.
function PhotoImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  // Нет src — placeholder
  if (!src || src.trim() === "" || src === "null") {
    return (
      <div className={`flex items-center justify-center bg-muted/60 text-muted-foreground ${className}`}>
        <ImageOff className="w-8 h-8" />
      </div>
    );
  }

  // Ошибка загрузки — placeholder
  if (errored) {
    return (
      <div className={`flex items-center justify-center bg-muted/60 text-muted-foreground ${className}`}>
        <ImageOff className="w-8 h-8" />
      </div>
    );
  }

  // Обычный рендер — img сам управляет своей загрузкой
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setErrored(true)}
      className={className}
    />
  );
}