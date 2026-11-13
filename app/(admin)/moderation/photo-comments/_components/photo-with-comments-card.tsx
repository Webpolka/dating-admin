// app/(admin)/moderation/photo-comments/_components/photo-with-comments-card.tsx
"use client";

import { useState } from "react";
import { PhotoView } from "react-photo-view";
import { useRouter } from "next/navigation";

import {
  useApproveRemainingComments,
  useRejectRemainingComments,
  type PhotoWithComments,
} from "@/hooks/admin/use-photo-comments";
import { UserBadge } from "@/components/admin/user-badge";
import type { UserBadgeData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Loader2, Check, X, Star } from "lucide-react";

import { CommentItem } from "./comment-item";

// Унифицированные бейджи (как в фото-модерации)
const BADGE_BASE_CLASS = "bg-black/70 text-white border-0 text-[11px] h-5 px-1.5";

export function PhotoWithCommentsCard({
  photo,
  searchedId,
  statusFilter,
  isKarantine,
}: {
  photo: PhotoWithComments;
  searchedId: number | null;
  statusFilter: string;
  isKarantine: boolean;
}) {
  const router = useRouter();
  const [showApproveRemaining, setShowApproveRemaining] = useState(false);
  const [showRejectRemaining, setShowRejectRemaining] = useState(false);

  const approveRemainingMutation = useApproveRemainingComments();
  const rejectRemainingMutation = useRejectRemainingComments();

  const isMassPending =
    approveRemainingMutation.isPending || rejectRemainingMutation.isPending;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-300">
      {/* Шапка: фото #ID + юзер + альбом + массовые кнопки */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20 flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-semibold text-foreground">Фото #{photo.id}</span>

          <span className="text-xs text-muted-foreground font-normal">от</span>

          <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
            {photo.user ? (
              <button
                onClick={() => router.push(`/users/${photo.user!.id}`)}
                className="hover:text-primary transition-colors"
              >
                <UserBadge user={photo.user as unknown as UserBadgeData} size="sm" showEmail={true} />
              </button>
            ) : (
              <span className="text-muted-foreground">Удален</span>
            )}
          </span>

          {photo.album && (
            <span className="text-xs text-muted-foreground font-normal border-l border-border pl-4">
              в альбоме «{photo.album.name}»
            </span>
          )}
        </div>

        {photo.pending_count > 0 && statusFilter === "pending" && (
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowApproveRemaining(true)}
              disabled={isMassPending}
            >
              {approveRemainingMutation.isPending && approveRemainingMutation.variables === photo.id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              Одобрить все ({photo.pending_count})
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowRejectRemaining(true)}
              disabled={isMassPending}
            >
              {rejectRemainingMutation.isPending && rejectRemainingMutation.variables === photo.id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <X className="w-4 h-4 mr-1" />
              )}
              Отклонить все
            </Button>
          </div>
        )}
      </div>

      {/* Контент: слева превью фото, справа дерево комментариев */}
      <div className="flex flex-col md:flex-row">
        {/* Левая колонка — превью фото */}
        <div className="md:w-64 lg:w-80 shrink-0 border-r border-border bg-muted/10 p-4 flex items-center justify-center">
          <div className="relative aspect-square bg-muted group overflow-hidden rounded-lg w-full max-w-50">
            <PhotoView src={photo.original_url}>
              <button className="block w-full h-full cursor-zoom-in" type="button">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.medium_url || photo.thumb_url}
                  alt="Фото"
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </button>
            </PhotoView>

            {/* Бейджи */}
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

            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
              {photo.is_intimate && (
                <span className={`${BADGE_BASE_CLASS} inline-flex items-center rounded font-medium bg-red-600/80`}>
                  18+
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Правая колонка — дерево комментариев */}
        <div className="flex-1 p-4 space-y-3 max-h-125 overflow-y-auto little-scroll">
          {photo.comments.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">
              Нет комментариев под этим фото
            </p>
          ) : (
            photo.comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                searchedId={searchedId}
                isKarantine={isKarantine}
                statusFilter={statusFilter}
                isReply={false}
              />
            ))
          )}
        </div>
      </div>

      {/* ConfirmDialog — одобрить все по этому фото */}
      <ConfirmDialog
        open={showApproveRemaining}
        onOpenChange={(open) => { if (!open) setShowApproveRemaining(false); }}
        title="Одобрить все комментарии под этим фото?"
        description={`Будут одобрены все ${photo.pending_count} ожидающих комментариев под фото #${photo.id}.`}
        confirmText="Одобрить все"
        cancelText="Отмена"
        variant="default"
        isLoading={approveRemainingMutation.isPending && approveRemainingMutation.variables === photo.id}
        onConfirm={() => {
          approveRemainingMutation.mutate(photo.id, {
            // onSuccess — диалог закрывается ТОЛЬКО при успехе.
            // При ошибке остаётся открытым, модератор видит toast и может retry.
            onSuccess: () => setShowApproveRemaining(false),
          });
        }}
      />

      {/* ConfirmDialog — отклонить все по этому фото */}
      <ConfirmDialog
        open={showRejectRemaining}
        onOpenChange={(open) => { if (!open) setShowRejectRemaining(false); }}
        title="Отклонить все комментарии под этим фото?"
        description={`Будут отклонены все ${photo.pending_count} ожидающих комментариев под фото #${photo.id}.`}
        confirmText="Отклонить все"
        cancelText="Отмена"
        variant="destructive"
        isLoading={rejectRemainingMutation.isPending && rejectRemainingMutation.variables === photo.id}
        onConfirm={() => {
          rejectRemainingMutation.mutate(photo.id, {
            onSuccess: () => setShowRejectRemaining(false),
          });
        }}
      />
    </div>
  );
}