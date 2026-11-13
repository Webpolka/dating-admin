// app/(admin)/moderation/dating/_components/swipe-row.tsx
"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  useDestroySwipe,
  SWIPE_TYPES,
  type SwipeItem,
} from "@/hooks/admin/use-dating";
import { UserBadge } from "@/components/admin/user-badge";
import type { UserBadgeData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { Heart, ThumbsDown, Star } from "lucide-react";

export function SwipeRow({
  swipe,
  isHighlighted = false,
  index = 0,
}: {
  swipe: SwipeItem;
  isHighlighted?: boolean;
  index?: number;
}) {
  const router = useRouter();
  const ref = useRef<HTMLTableRowElement>(null);
  const [showDestroy, setShowDestroy] = useState(false);

  const destroyMutation = useDestroySwipe();

  useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  const rowClassName = [
    "border-b border-border transition-colors",
    isHighlighted ? "bg-blue-50 dark:bg-blue-950/40 " : "",
  ].filter(Boolean).join(" ");

  const typeMeta = SWIPE_TYPES[swipe.type] ?? { label: swipe.type, color: "bg-secondary text-secondary-foreground" };

  return (
    <TableRow
      ref={ref}
      className={`${rowClassName} animate-in fade-in slide-in-from-bottom-1 duration-300`}
      style={{ animationDelay: `${Math.min(index * 15, 400)}ms`, animationFillMode: "backwards" }}
    >
      <TableCell className={`text-xs font-mono whitespace-nowrap tabular-nums align-top pt-3 ${isHighlighted ? "text-primary font-bold" : "text-muted-foreground"}`}>
        #{swipe.id}
      </TableCell>

      {/* Кто оценил */}
      <TableCell className="align-top pt-3">
        {swipe.user ? (
          <button
            onClick={() => router.push(`/users/${swipe.user!.id}`)}
            className="block text-left"
          >
            <UserBadge user={swipe.user as unknown as UserBadgeData} size="sm" showEmail={true} />
          </button>
        ) : (
          <span className="text-xs text-muted-foreground italic">Пользователь удален</span>
        )}
      </TableCell>

      {/* Кого оценили */}
      <TableCell className="align-top pt-3">
        {swipe.targetUser ? (
          <button
            onClick={() => router.push(`/users/${swipe.targetUser!.id}`)}
            className="block text-left"
          >
            <UserBadge user={swipe.targetUser as unknown as UserBadgeData} size="sm" showEmail={true} />
          </button>
        ) : (
          <span className="text-xs text-muted-foreground italic">Пользователь удален</span>
        )}
      </TableCell>

      {/* Тип свайпа */}
      <TableCell className="align-top pt-3">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${typeMeta.color}`}>
          {swipe.type === "like" && <Heart className="w-3 h-3 fill-current" />}
          {swipe.type === "superlike" && <Star className="w-3 h-3 fill-current" />}
          {swipe.type === "dislike" && <ThumbsDown className="w-3 h-3" />}
          {typeMeta.label}
          {swipe.rewinded && <span className="opacity-70 ml-1">(отменен)</span>}
        </span>
      </TableCell>

      {/* Дата */}
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap align-top pt-3">
        {swipe.created_at ? new Date(swipe.created_at).toLocaleString("ru-RU", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit"
        }) : "—"}
      </TableCell>

      {/* Действия */}
      <TableCell className="text-right align-top pt-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setShowDestroy(true)}
          disabled={destroyMutation.isPending}
          title="Удалить свайп"
          className="text-destructive hover:bg-destructive/10"
        >
          {destroyMutation.isPending && destroyMutation.variables === swipe.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </Button>
      </TableCell>

      {/* ConfirmDialog — Удалить свайп */}
      <ConfirmDialog
        open={showDestroy}
        onOpenChange={(open) => { if (!open) setShowDestroy(false); }}
        title="Удалить свайп?"
        description="Если это был лайк или суперлайк, связанный мэтч (если он есть) будет принудительно разорван."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="destructive"
        isLoading={destroyMutation.isPending && destroyMutation.variables === swipe.id}
        onConfirm={() => {
          destroyMutation.mutate(swipe.id, {
            onSuccess: () => setShowDestroy(false),
          });
        }}
      />
    </TableRow>
  );
}