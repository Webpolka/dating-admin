// app/(admin)/moderation/diary/_components/diary-row.tsx
"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  useApproveDiary,
  useRejectDiary,
  useSoftDeleteDiary,
  useRestoreDiary,
  useForceDeleteDiary,
  DIARY_REJECT_REASONS,
  DIARY_STATUS_BADGES,
  type DiaryItem,
} from "@/hooks/admin/use-diaries";
import { UserBadge } from "@/components/admin/user-badge";
import type { UserBadgeData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, MoreHorizontal, Eye, Check, Trash2, RotateCcw, Globe, User ,EyeOff, MessageSquare} from "lucide-react";
import { formatDate, formatTime } from "@/lib/format";

export function DiaryRow({
  diary,
  isHighlighted = false,
  index = 0,
}: {
  diary: DiaryItem;
  isHighlighted?: boolean;
  index?: number;
}) {
  const router = useRouter();
  const ref = useRef<HTMLTableRowElement>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [showForceDelete, setShowForceDelete] = useState(false);

  const approveMutation = useApproveDiary();
  const rejectMutation = useRejectDiary();
  const softDeleteMutation = useSoftDeleteDiary();
  const restoreMutation = useRestoreDiary();
  const forceDeleteMutation = useForceDeleteDiary();

  const isAnyPending =
    approveMutation.isPending || rejectMutation.isPending ||
    softDeleteMutation.isPending || restoreMutation.isPending || forceDeleteMutation.isPending;

  useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  const rowClassName = [
    "border-b border-border transition-colors",
    isHighlighted ? "bg-blue-50 dark:bg-blue-950/40 " : "",
  ].filter(Boolean).join(" ");

  const statusBadge = DIARY_STATUS_BADGES[diary.status] ?? { variant: "secondary", label: diary.status };

  return (
    <TableRow
      ref={ref}
      className={`${rowClassName} animate-in fade-in slide-in-from-bottom-1 duration-300`}
      style={{ animationDelay: `${Math.min(index * 15, 400)}ms`, animationFillMode: "backwards" }}
    >
      <TableCell className={`text-xs font-mono whitespace-nowrap tabular-nums align-top pt-3 ${isHighlighted ? "text-primary font-bold" : "text-muted-foreground"}`}>
        #{diary.id}
      </TableCell>

      {/* Автор */}
      <TableCell className="align-top pt-3">
        {diary.user ? (
          <button onClick={() => router.push(`/admin/users/${diary.user?.id}`)} className="block text-left">
            <UserBadge user={diary.user as unknown as UserBadgeData} size="sm" showEmail={true} />
          </button>
        ) : (
          <span className="text-xs text-muted-foreground italic">Удален</span>
        )}
      </TableCell>

      {/* Заголовок */}
      <TableCell className="align-top pt-3">
        {diary.trashed ? (
          <span className="text-sm font-medium text-muted-foreground line-clamp-1">{diary.title}</span>
        ) : (
          <button
            onClick={() => router.push(`/moderation/diary/${diary.id}`)}
            className="text-sm font-medium line-clamp-1 text-left hover:text-primary"
          >
            {diary.title}
          </button>
        )}
      </TableCell>

      {/* Рубрика — с иконкой Globe (системная) / User (личная автора) */}
      <TableCell className="align-top pt-3">
        {diary.diary_rubric ? (
          <Badge
            variant={diary.diary_rubric.is_active ? "outline" : "secondary"}
            className={`text-xs gap-1.5 max-w-full px-2 py-0.5 ${!diary.diary_rubric.is_active ? "opacity-60" : ""}`}
            title={diary.diary_rubric.is_personal ? "Личная рубрика автора" : "Системная рубрика (общая)" + (!diary.diary_rubric.is_active ? " (скрыта)" : "")}
          >
            {diary.diary_rubric.is_personal ? (
              <User className="w-3.5 h-3.5 shrink-0 text-purple-500" />
            ) : (
              <Globe className="w-3.5 h-3.5 shrink-0 text-blue-500" />
            )}            
            <span className="truncate">{diary.diary_rubric.name}</span>
            {!diary.diary_rubric.is_active && <EyeOff className="w-3 h-3 shrink-0 text-muted-foreground" />}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground italic">Без рубрики</span>
        )}
      </TableCell>

      {/* Статус */}
      <TableCell className="align-top pt-3">
        <div className="flex flex-col gap-1">
          {diary.trashed ? (
            <Badge variant="destructive" className="text-[10px]">Карантин</Badge>
          ) : (
            <Badge variant={statusBadge.variant as "default" | "secondary" | "destructive" | "warning" | "success"} className="text-[10px]">
              {statusBadge.label}
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Статистика */}
      <TableCell className="text-xs text-muted-foreground align-top pt-3">
        <div>👁 {diary.views_count}</div>
        <div>💬 {diary.comments_count}</div>
      </TableCell>

      {/* Даты */}
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap align-top pt-3 tabular-nums">
        {diary.published_at ? (
          <>
            <div className="text-foreground/80" title="Опубликовано">
              {formatDate(diary.published_at)}, {formatTime(diary.published_at)}
            </div>
            {diary.updated_at && diary.updated_at !== diary.published_at && (
              <div className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5" title="Последнее обновление">
                ↻ {formatDate(diary.updated_at)}, {formatTime(diary.updated_at)}
              </div>
            )}
          </>
        ) : diary.created_at ? (
          <>
            <div title="Создано">
              {formatDate(diary.created_at)}, {formatTime(diary.created_at)}
            </div>
            {diary.updated_at && diary.updated_at !== diary.created_at && (
              <div className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5" title="Последнее обновление">
                ↻ {formatDate(diary.updated_at)}, {formatTime(diary.updated_at)}
              </div>
            )}
          </>
        ) : (
          <span className="italic opacity-60">—</span>
        )}
      </TableCell>

      {/* Действия */}
      <TableCell className="text-right align-top pt-3">
        {!diary.trashed ? (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger render={
              <Button variant="ghost" size="icon-sm" disabled={isAnyPending}>
                {isAnyPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
              </Button>
            }/>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => router.push(`/moderation/diary/${diary.id}`)}>
                  <Eye className="w-4 h-4" /> Открыть
                </DropdownMenuItem>
                <DropdownMenuItem 
                  disabled={diary.comments_count === 0}
                  onClick={() => diary.comments_count > 0 && router.push(`/moderation/diary-comments?diary_id=${diary.id}`)}
                >
                  <MessageSquare className="w-4 h-4" /> Комментарии ({diary.comments_count})
                </DropdownMenuItem>

                {diary.status === "pending" && (
                  <>
                    <DropdownMenuItem onClick={() => approveMutation.mutate({ id: diary.id })}>
                      <Check className="w-4 h-4 text-green-500" /> Одобрить
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Отклонить по причине:</DropdownMenuLabel>
                    {DIARY_REJECT_REASONS.map(r => (
                      <DropdownMenuItem
                        key={r.value}
                        variant="destructive"
                        onClick={() => rejectMutation.mutate({ id: diary.id, reason: r.value })}
                      >
                        {r.label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}

                {diary.status === "rejected" && (
                  <DropdownMenuItem variant="destructive" onClick={() => setShowDelete(true)}>
                    <Trash2 className="w-4 h-4" /> В карантин
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex gap-1 justify-end">
            <Button variant="ghost" size="icon-sm" onClick={() => restoreMutation.mutate(diary.id)} disabled={isAnyPending} title="Восстановить">
              {restoreMutation.isPending && restoreMutation.variables === diary.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 text-blue-500" />
              )}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setShowForceDelete(true)} disabled={isAnyPending} title="Удалить навсегда">
              {forceDeleteMutation.isPending && forceDeleteMutation.variables === diary.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 text-destructive" />
              )}
            </Button>
          </div>
        )}
      </TableCell>

      {/* ConfirmDialog — В карантин */}
      <ConfirmDialog
        open={showDelete}
        onOpenChange={(open) => { if (!open) setShowDelete(false); }}
        title="Отправить в карантин?"
        description="Запись будет немедленно скрыта с сайта БЕЗ уведомления автора."
        confirmText="В карантин"
        cancelText="Отмена"
        variant="destructive"
        isLoading={softDeleteMutation.isPending && softDeleteMutation.variables === diary.id}
        onConfirm={() => {
          softDeleteMutation.mutate(diary.id, {
            // onSuccess — диалог закрывается ТОЛЬКО при успехе.
            // При ошибке остаётся открытым, модератор видит toast и может retry.
            onSuccess: () => setShowDelete(false),
          });
        }}
      />

      {/* ConfirmDialog — Удалить навсегда */}
      <ConfirmDialog
        open={showForceDelete}
        onOpenChange={(open) => { if (!open) setShowForceDelete(false); }}
        title="Удалить навсегда?"
        description="Это действие необратимо. Запись будет удалена без возможности восстановления."
        confirmText="Удалить навсегда"
        cancelText="Отмена"
        variant="destructive"
        isLoading={forceDeleteMutation.isPending && forceDeleteMutation.variables === diary.id}
        onConfirm={() => {
          forceDeleteMutation.mutate(diary.id, {
            onSuccess: () => setShowForceDelete(false),
          });
        }}
      />
    </TableRow>
  );
}