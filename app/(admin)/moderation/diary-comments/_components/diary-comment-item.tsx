// app/(admin)/moderation/diary-comments/_components/diary-comment-item.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  useApproveDiaryComment,
  useRejectDiaryComment,
  useRestoreDiaryComment,
  useSoftDeleteDiaryComment,
  useDestroyDiaryComment,
  COMMENT_REJECT_REASONS,
  getCommentRejectReasonLabel,
  getCommentRejectReasonColor,
  type DiaryCommentItem,
} from "@/hooks/admin/use-diaries";
import { UserBadge } from "@/components/admin/user-badge";
import type { UserBadgeData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Check, X, RotateCcw, EyeOff, Trash2 } from "lucide-react";

/**
 * Карточка одного комментария к дневнику в модерации.
 *
 * Полная аналогия с comment-item.tsx (photo-comments):
 *   - Стратегия модерации (Вариант A): 3 статуса, спам = причина.
 *   - Бейдж причины показывается ТОЛЬКО при status='rejected'.
 *   - Бейдж «В карантине» показывается для trashed в любом табе.
 *
 * Логика кликабельности (canAct):
 *   Таб         | canAct когда
 *   ------------+-----------------------------------------
 *   all         | всегда (любой не-trashed комментарий)
 *   pending     | comment.status === 'pending'
 *   approved    | comment.status === 'approved'
 *   rejected    | comment.status === 'rejected'
 *   karantine   | comment.trashed === true
 *
 * Логика видимости кнопок (синхронизирована с бэкендом):
 *   approve  на ребёнке: видна только если parent.status === 'approved'.
 *   restore на ребёнке: видна только если parent не rejected и не trashed.
 *   reject, softDelete, destroy: видна всегда.
 *
 *   Если кнопка спрятана — показывается бейдж «🔒 ...» с пояснением.
 */
const STATUS_BADGES: Record<string, { variant: string; label: string }> = {
  pending: { variant: "warning", label: "Ожидает" },
  approved: { variant: "success", label: "Одобрен" },
  rejected: { variant: "destructive", label: "Отклонен" },
};

export function DiaryCommentItemRow({
  comment,
  searchedId,
  isKarantine,
  statusFilter,
  isReply = false,
}: {
  comment: DiaryCommentItem;
  searchedId: number | null;
  isKarantine: boolean;
  statusFilter: string;
  isReply?: boolean;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [showDestroy, setShowDestroy] = useState(false);

  const approveMutation = useApproveDiaryComment();
  const rejectMutation = useRejectDiaryComment();
  const restoreMutation = useRestoreDiaryComment();
  const softDeleteMutation = useSoftDeleteDiaryComment();
  const destroyMutation = useDestroyDiaryComment();

  const isAnyPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    restoreMutation.isPending ||
    softDeleteMutation.isPending ||
    destroyMutation.isPending;

  const isHighlighted = searchedId === comment.id;
  const isQuarantine = comment.trashed;

  // === Родительские guards — синхронизированы с бэкендом ===
  const hasParent = !!comment.parent_id && !!comment.parent;
  const parentIsApproved = hasParent && comment.parent!.status === "approved";
  const parentIsRejected = hasParent && comment.parent!.status === "rejected";
  const parentIsTrashed = hasParent && comment.parent!.trashed;
  const parentIsPending = hasParent && comment.parent!.status === "pending";

  const approveHiddenOnParent = hasParent && !parentIsApproved;
  const restoreHiddenOnParent = hasParent && (parentIsRejected || parentIsTrashed);

  // === Кликабельность в соответствии с фильтром ===
  const canAct = isKarantine
    ? comment.trashed
    : statusFilter === "all" || comment.status === statusFilter;

  useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  // Логика dimmed:
  // - В карантине: dimmed всё, что НЕ удалено (чтобы визуально выделить удалённые)
  // - В других табах: dimmed всё, что удалено (если вдруг проскочит) или статус не совпадает с табом
  const isDimmed = isKarantine
    ? !comment.trashed
    : comment.trashed || (statusFilter !== "all" && comment.status !== statusFilter);

  const badge = STATUS_BADGES[comment.status] ?? { variant: "secondary", label: comment.status };
  const rejectColor = getCommentRejectReasonColor(comment.reject_reason);
  const rejectLabel = getCommentRejectReasonLabel(comment.reject_reason);

  const buttonsDisabled = isAnyPending || !canAct;

  // Текст для бейджа «🔒 ...» — поясняет, ПОЧЕМУ кнопка спрятана.
  // Приоритет: trashed > rejected > pending (если одновременно несколько — берём худшее).
  const parentBlockReason = !hasParent
    ? null
    : parentIsTrashed
      ? "Родитель в карантине — сначала восстановите его"
      : parentIsRejected
        ? "Родитель отклонён — сначала пересмотрите его"
        : parentIsPending
          ? "Дождитесь одобрения родителя"
          : null;

  // Показываем бейдж, если хотя бы одна кнопка спрятана из-за родителя.
  const showParentBlockBadge = hasParent && (approveHiddenOnParent || restoreHiddenOnParent) && !!parentBlockReason;

  return (
    <div className="space-y-2">
      <div
        ref={ref}
        className={`flex items-start gap-4 p-3 rounded-lg border transition-all animate-in fade-in slide-in-from-bottom-1 duration-200 ${
          comment.status === "pending"
            ? "bg-yellow-500/5 border-yellow-500/20"
            : "bg-muted/10 border-border"
        } ${isDimmed ? "opacity-50" : ""} ${
          isHighlighted ? "ring-4 ring-blue-500/60 shadow-lg" : ""
        }`}
      >
        {/* Аватар автора */}
        {comment.user ? (
          <button
            onClick={() => router.push(`/users/${comment.user!.id}`)}
            className="shrink-0"
          >
            <UserBadge user={comment.user as unknown as UserBadgeData} showEmail={true} />
          </button>
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
            <span className="text-[10px] text-muted-foreground">?</span>
          </div>
        )}

        {/* Контент комментария */}
        <div className="flex-1 min-w-0 border-border border-l pl-4">
          {/* Шапка: #ID + имя + время + статус-бейдж + причина */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] text-muted-foreground font-mono py-0.5 px-1 rounded-sm bg-muted">
              Comment #{comment.id}
            </span>

            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(comment.created_at)}
            </span>

            <Badge variant={badge.variant as "default" | "secondary" | "destructive" | "warning" | "success"} className="text-[10px] h-5">
              {badge.label}
            </Badge>

            {/* Бейдж «В карантине» — для trashed-комментариев в любом табе.
                Особенно важен в табе «Все», где trashed-записи видны полупрозрачными. */}
            {comment.trashed && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-500">
                <EyeOff className="w-3 h-3" />
                В карантине
              </span>
            )}

            {/* Причина отказа — только для rejected (не trashed).
                Показываем ВСЕ причины (включая 'spam' и 'parent_rejected'). */}
            {comment.status === "rejected" && !comment.trashed && rejectLabel && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${rejectColor ?? "bg-secondary text-secondary-foreground"}`}>
                {rejectLabel}
              </span>
            )}

            {/* Подсказка «🔒 ...» — когда approve/restore спрятаны из-за родителя. */}
            {showParentBlockBadge && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-500"
                title={parentBlockReason ?? ""}
              >
                🔒 {parentBlockReason}
              </span>
            )}
          </div>

          {/* Текст комментария */}
          <p className={`text-sm ${isReply ? "text-xs" : ""} mt-0.5 wrap-break-words`}>
            {comment.content}
          </p>
        </div>

        {/* Кнопки действий */}
        <div className="flex gap-1 shrink-0">
          {!isQuarantine && (
            <>
              {comment.status === "pending" && (
                <>
                  {/* Одобрить — спрятана, если родитель не approved. */}
                  {!approveHiddenOnParent && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => approveMutation.mutate(comment.id)}
                      disabled={buttonsDisabled}
                      title="Одобрить"
                    >
                      {approveMutation.isPending && approveMutation.variables === comment.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </Button>
                  )}

                  {/* Отклонить (dropdown с причиной) — доступен всегда. */}
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button variant="ghost" size="icon-sm" disabled={buttonsDisabled} title="Отклонить">
                        <X className="w-4 h-4 text-yellow-500" />
                      </Button>
                    }/>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Причина отклонения</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {COMMENT_REJECT_REASONS.map((r) => (
                          <DropdownMenuItem
                            key={r.value}
                            onClick={() => rejectMutation.mutate({ id: comment.id, reason: r.value })}
                          >
                            {r.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              {comment.status === "approved" && (
                <>
                  {/* Отклонить (dropdown с причиной) — доступен всегда. */}
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button variant="ghost" size="icon-sm" disabled={buttonsDisabled} title="Отклонить">
                        <X className="w-4 h-4 text-yellow-500" />
                      </Button>
                    }/>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Причина отклонения</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {COMMENT_REJECT_REASONS.map((r) => (
                          <DropdownMenuItem
                            key={r.value}
                            onClick={() => rejectMutation.mutate({ id: comment.id, reason: r.value })}
                          >
                            {r.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              {comment.status === "rejected" && (
                <>
                  {/* Вернуть на модерацию — спрятана, если родитель rejected/trashed. */}
                  {!restoreHiddenOnParent && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => restoreMutation.mutate(comment.id)}
                      disabled={buttonsDisabled}
                      title="Вернуть на модерацию"
                    >
                      {restoreMutation.isPending && restoreMutation.variables === comment.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4 text-blue-500" />
                      )}
                    </Button>
                  )}

                  {/* В карантин — только для отклонённых. Доступен всегда. */}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => softDeleteMutation.mutate(comment.id)}
                    disabled={buttonsDisabled}
                    title="В карантин"
                  >
                    {softDeleteMutation.isPending && softDeleteMutation.variables === comment.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </>
              )}
            </>
          )}

          {isQuarantine && (
            <>
              {/* Восстановить из карантина — спрятана, если родитель rejected/trashed. */}
              {!restoreHiddenOnParent && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => restoreMutation.mutate(comment.id)}
                  disabled={buttonsDisabled}
                  title="Восстановить из карантина"
                >
                  {restoreMutation.isPending && restoreMutation.variables === comment.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4 text-blue-500" />
                  )}
                </Button>
              )}

              {/* Удалить навсегда — доступна всегда. */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowDestroy(true)}
                disabled={buttonsDisabled}
                title="Удалить навсегда"
              >
                {destroyMutation.isPending && destroyMutation.variables === comment.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 text-destructive" />
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Рекурсивный рендер ответов */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="pl-12 border-l-2 border-border space-y-2 -mt-1">
          {comment.replies.map((reply) => (
            <DiaryCommentItemRow
              key={reply.id}
              comment={reply}
              searchedId={searchedId}
              isKarantine={isKarantine}
              statusFilter={statusFilter}
              isReply={true}
            />
          ))}
        </div>
      )}

      {/* ConfirmDialog — Удалить навсегда */}
      <ConfirmDialog
        open={showDestroy}
        onOpenChange={(open) => { if (!open) setShowDestroy(false); }}
        title="Удалить комментарий навсегда?"
        description="Это действие необратимо. Комментарий и все его ответы будут удалены без возможности восстановления."
        confirmText="Удалить навсегда"
        cancelText="Отмена"
        variant="destructive"
        isLoading={destroyMutation.isPending && destroyMutation.variables === comment.id}
        onConfirm={() => {
          destroyMutation.mutate(comment.id, {
            onSuccess: () => setShowDestroy(false),
          });
        }}
      />
    </div>
  );
}

// ============================================================
// Хелпер: относительное время ("5 минут назад")
// ============================================================
function formatRelativeTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "только что";
  if (diffMin < 60) return `${diffMin} ${pluralize(diffMin, "минуту", "минуты", "минут")} назад`;
  if (diffHour < 24) return `${diffHour} ${pluralize(diffHour, "час", "часа", "часов")} назад`;
  if (diffDay < 7) return `${diffDay} ${pluralize(diffDay, "день", "дня", "дней")} назад`;

  // Если больше недели — формат DD.MM.YYYY
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}