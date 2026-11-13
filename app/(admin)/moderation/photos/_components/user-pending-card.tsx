// app/(admin)/moderation/photos/_components/user-pending-card.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  useApproveAllForUser,
  useRejectAllForUser,
  type UserCard,
  type PhotoItem,
} from "@/hooks/admin/use-photos";
import { UserBadge } from "@/components/admin/user-badge";
import type { UserBadgeData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Loader2, Check, X } from "lucide-react";

import { PhotoCard } from "./photo-card";

export function UserPendingCard({
  user,
  searchedId,
  onReject,
}: {
  user: UserCard;
  searchedId: number | null;
  onReject: (photo: PhotoItem) => void;
}) {
  const router = useRouter();
  const [showApproveAll, setShowApproveAll] = useState(false);
  const [showRejectAll, setShowRejectAll] = useState(false);

  const approveAllMutation = useApproveAllForUser();
  const rejectAllMutation = useRejectAllForUser();

  // Пока идёт массовая операция — блокируем все кнопки
  const isMassPending = approveAllMutation.isPending || rejectAllMutation.isPending;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Шапка юзера */}
      <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between gap-4 flex-wrap">
        <button
          onClick={() => router.push(`/users/${user.id}`)}
          className="flex items-center gap-3 text-left flex-1 min-w-0"
        >
          <UserBadge user={user as unknown as UserBadgeData} size="sm" showEmail={true} />
          <div className="text-xs text-muted-foreground hidden sm:block">
            <div>ID: {user.id}</div>
            <div>В очереди: {user.pending_photos_count}</div>
          </div>
        </button>

        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowApproveAll(true)}
            disabled={isMassPending}
          >
            {approveAllMutation.isPending && approveAllMutation.variables === user.id ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Check className="w-4 h-4 mr-1" />
            )}
            Одобрить все
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowRejectAll(true)}
            disabled={isMassPending}
          >
            <X className="w-4 h-4 mr-1" /> Отклонить все
          </Button>
        </div>
      </div>

      {/* Сетка фото — 4 колонки, как в grid-режиме. PhotoCard с hideUserBadge=true */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 bg-card">
        {user.photos.map((photo, i) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            isHighlighted={photo.id === searchedId}
            onReject={onReject}
            hideUserBadge={true}
            index={i}
          />
        ))}
      </div>

      {/* ConfirmDialog для массового одобрения */}
      <ConfirmDialog
        open={showApproveAll}
        onOpenChange={(open) => { if (!open) setShowApproveAll(false); }}
        title="Одобрить все фото?"
        description={`Вы уверены, что хотите одобрить все фото пользователя ${user.name}? (${user.pending_photos_count} шт.)`}
        confirmText="Одобрить все"
        cancelText="Отмена"
        variant="default"
        isLoading={approveAllMutation.isPending && approveAllMutation.variables === user.id}
        onConfirm={() => {
              approveAllMutation.mutate(user.id, {
          onSuccess: () => setShowApproveAll(false),
        });
        }}
      />

      {/* ConfirmDialog для массового отклонения */}
      <ConfirmDialog
        open={showRejectAll}
        onOpenChange={(open) => { if (!open) setShowRejectAll(false); }}
        title="Отклонить все фото?"
        description={`Вы уверены, что хотите отклонить все фото пользователя ${user.name}? (${user.pending_photos_count} шт.)`}
        confirmText="Отклонить все"
        cancelText="Отмена"
        variant="destructive"
        isLoading={rejectAllMutation.isPending && rejectAllMutation.variables === user.id}
        onConfirm={() => {
        rejectAllMutation.mutate(user.id, {
          onSuccess: () => setShowRejectAll(false),
        });
        }}
      />
    </div>
  );
}