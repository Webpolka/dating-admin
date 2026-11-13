// app/(admin)/moderation/dating/_components/match-row.tsx
"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  useDestroyMatch,
  useRestoreMatch,
  MATCH_STATUSES,
  type MatchItem,
} from "@/hooks/admin/use-dating";
import { UserBadge } from "@/components/admin/user-badge";
import type { UserBadgeData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Loader2, Trash2, RotateCcw } from "lucide-react";

export function MatchRow({
  match,
  isHighlighted = false,
  index = 0,
}: {
  match: MatchItem;
  isHighlighted?: boolean;
  index?: number;
}) {
  const router = useRouter();
  const ref = useRef<HTMLTableRowElement>(null);
  const [showAction, setShowAction] = useState(false);

  const destroyMutation = useDestroyMatch();
  const restoreMutation = useRestoreMatch();

  const isPending =
    (destroyMutation.isPending && destroyMutation.variables === match.id) ||
    (restoreMutation.isPending && restoreMutation.variables === match.id);

  useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  const rowClassName = [
    "border-b border-border transition-colors",
    isHighlighted ? "bg-blue-50 dark:bg-blue-950/40 " : "",
  ].filter(Boolean).join(" ");

  const statusMeta = MATCH_STATUSES[match.status] ?? { label: match.status, color: "bg-secondary text-secondary-foreground" };
  const isActive = match.status === "active";

  return (
    <TableRow
      ref={ref}
      className={`${rowClassName} animate-in fade-in slide-in-from-bottom-1 duration-300`}
      style={{ animationDelay: `${Math.min(index * 15, 400)}ms`, animationFillMode: "backwards" }}
    >
      <TableCell className={`text-xs font-mono whitespace-nowrap tabular-nums align-top pt-3 ${isHighlighted ? "text-primary font-bold" : "text-muted-foreground"}`}>
        #{match.id}
      </TableCell>

      {/* Пользователь 1 */}
      <TableCell className="align-top pt-3">
        {match.user1 ? (
          <button
            onClick={() => router.push(`/users/${match.user1!.id}`)}
            className="block text-left"
          >
            <UserBadge user={match.user1 as unknown as UserBadgeData} size="sm" showEmail={true} />
          </button>
        ) : (
          <span className="text-xs text-muted-foreground italic">Пользователь удален</span>
        )}
      </TableCell>

      {/* Пользователь 2 */}
      <TableCell className="align-top pt-3">
        {match.user2 ? (
          <button
            onClick={() => router.push(`/users/${match.user2!.id}`)}
            className="block text-left"
          >
            <UserBadge user={match.user2 as unknown as UserBadgeData} size="sm" showEmail={true} />
          </button>
        ) : (
          <span className="text-xs text-muted-foreground italic">Пользователь удален</span>
        )}
      </TableCell>

      {/* Статус мэтча */}
      <TableCell className="align-top pt-3">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${statusMeta.color}`}>
          {statusMeta.label}
        </span>
        {match.unmatched_at && (
          <div className="text-[10px] text-muted-foreground mt-1">
            {new Date(match.unmatched_at).toLocaleDateString("ru-RU")}
          </div>
        )}
      </TableCell>

      {/* Дата */}
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap align-top pt-3">
        {match.created_at ? new Date(match.created_at).toLocaleString("ru-RU", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit"
        }) : "—"}
      </TableCell>

      {/* Действия */}
      <TableCell className="text-right align-top pt-3">
        {isActive ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowAction(true)}
            disabled={isPending}
            title="Разорвать мэтч"
            className="text-destructive hover:bg-destructive/10"
          >
            {destroyMutation.isPending && destroyMutation.variables === match.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowAction(true)}
            disabled={isPending}
            title="Восстановить мэтч"
            className="text-blue-500 hover:bg-blue-500/10"
          >
            {restoreMutation.isPending && restoreMutation.variables === match.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
          </Button>
        )}
      </TableCell>

      {/* ConfirmDialog — Разорвать или Восстановить */}
      <ConfirmDialog
        open={showAction}
        onOpenChange={(open) => { if (!open) setShowAction(false); }}
        title={isActive ? "Разорвать мэтч?" : "Восстановить мэтч?"}
        description={
          isActive
            ? "Пользователи больше не смогут общаться. Действие можно будет отменить."
            : "Пользователи снова смогут общаться друг с другом."
        }
        confirmText={isActive ? "Разорвать" : "Восстановить"}
        cancelText="Отмена"
        variant={isActive ? "destructive" : "default"}
        isLoading={isPending}
        onConfirm={() => {
          if (isActive) {
            destroyMutation.mutate(match.id, {
              onSuccess: () => setShowAction(false),
            });
          } else {
            restoreMutation.mutate(match.id, {
              onSuccess: () => setShowAction(false),
            });
          }
        }}
      />
    </TableRow>
  );
}