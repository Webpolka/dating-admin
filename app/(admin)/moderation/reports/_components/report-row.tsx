// app/(admin)/moderation/reports/_components/report-row.tsx
"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  useResolveReport,
  useRejectReport,
  useReopenReport,
  useToggleBanUser,
  useRejectReportPhoto,
  REPORT_REASONS,
  REPORT_RESOLUTIONS,
  type ReportItem,
} from "@/hooks/admin/use-reports";
import { UserBadge } from "@/components/admin/user-badge";
import type { UserBadgeData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal, Loader2, AlertTriangle, EyeOff, Clock, Lock, Unlock,
  XCircle, RotateCcw, ImageIcon,
} from "lucide-react";

const STATUS_BADGES: Record<string, { variant: string; label: string }> = {
  pending: { variant: "warning", label: "Ожидает" },
  resolved: { variant: "success", label: "Решена" },
  rejected: { variant: "secondary", label: "Отклонена" },
};

export function ReportRow({
  report,
  isHighlighted = false,
  index = 0,
}: {
  report: ReportItem;
  isHighlighted?: boolean;
  index?: number;
}) {
  const router = useRouter();
  const ref = useRef<HTMLTableRowElement>(null);

  const resolveMutation = useResolveReport();
  const rejectMutation = useRejectReport();
  const reopenMutation = useReopenReport();
  const banMutation = useToggleBanUser();
  const rejectPhotoMutation = useRejectReportPhoto();

  // H2: ConfirmDialog state для destructive actions (ban/photo-reject).
  // Раньше ban/photo-reject кликались сразу без подтверждения — misclick необратим.
  const [confirmAction, setConfirmAction] = useState<{
    type: "ban" | "photoReject";
    userId?: number;
    banType?: string;
    photoId?: number;
    reportId?: number;
    title: string;
    description: string;
  } | null>(null);

  const isAnyPending =
    resolveMutation.isPending ||
    rejectMutation.isPending ||
    reopenMutation.isPending ||
    banMutation.isPending ||
    rejectPhotoMutation.isPending;

  useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  const rowClassName = [
    "border-b border-border transition-colors",
    isHighlighted ? "bg-blue-50 dark:bg-blue-950/40 " : "",
  ].filter(Boolean).join(" ");

  const reasonMeta = REPORT_REASONS[report.reason] ?? { label: report.reason, color: "bg-secondary text-secondary-foreground" };
  const statusBadge = STATUS_BADGES[report.status] ?? { variant: "secondary", label: report.status };
  
  const isPending = report.status === "pending";
  const isUserReport = report.reportable_type === "User";
  const isPhotoReport = report.reportable_type === "Photo";
  
  const reportedUser = report.reported;
  const isReportedBanned = reportedUser?.status === "banned" || reportedUser?.status === "shadowbanned";

  return (
    <TableRow
      ref={ref}
      className={`${rowClassName} animate-in fade-in slide-in-from-bottom-1 duration-300`}
      style={{ animationDelay: `${Math.min(index * 15, 400)}ms`, animationFillMode: "backwards" }}
    >
      <TableCell className={`text-xs font-mono whitespace-nowrap tabular-nums align-top pt-3 ${isHighlighted ? "text-primary font-bold" : "text-muted-foreground"}`}>
        #{report.id}
      </TableCell>

      {/* Жалобщик */}
      <TableCell className="align-top pt-3">
        {report.reporter ? (
          <button onClick={() => router.push(`/users/${report.reporter?.id}`)} className="block text-left">
            <UserBadge user={report.reporter as unknown as UserBadgeData} size="sm" showEmail={true} />
          </button>
        ) : (
          <span className="text-xs text-muted-foreground italic">Удален</span>
        )}
      </TableCell>

      {/* Объект жалобы */}
      <TableCell className="align-top pt-3">
        {isUserReport && (
          reportedUser ? (
            <button onClick={() => router.push(`/users/${reportedUser.id}`)} className="block text-left">
              <UserBadge user={reportedUser as unknown as UserBadgeData} size="sm" showEmail={true} />
            </button>
          ) : (
            <span className="text-xs text-muted-foreground italic">Удален</span>
          )
        )}
        {isPhotoReport && (
          <div className="flex items-center gap-2">
            {report.photo ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={report.photo.thumb_url || report.photo.medium_url}
                  alt="Жалоба на фото"
                  className="w-10 h-10 object-cover rounded bg-muted shrink-0"
                />
                <div className="text-xs">
                  <button
                    onClick={() => router.push(`/moderation/photos?q=${report.photo?.id}`)}
                    className="text-muted-foreground hover:text-primary"
                  >
                    Фото #{report.photo.id}
                  </button>
                  {report.photo.user && (
                    <button
                      onClick={() => router.push(`/users/${report.photo?.user?.id}`)}
                      className="block text-muted-foreground hover:text-primary"
                    >
                      {report.photo.user.name}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                <ImageIcon className="w-4 h-4" /> Удалено
              </span>
            )}
          </div>
        )}
      </TableCell>

      {/* Причина и описание */}
      <TableCell className="align-top pt-3">
        <div className="flex flex-col gap-1">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium w-fit ${reasonMeta.color}`}>
            {reasonMeta.label}
          </span>
          {report.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{report.description}</p>
          )}
          {!isPending && report.resolution && (
            <div className="text-[10px] text-muted-foreground">
              Решение: <span className={`font-medium ${REPORT_RESOLUTIONS[report.resolution]?.color}`}>{REPORT_RESOLUTIONS[report.resolution]?.label}</span>
            </div>
          )}
        </div>
      </TableCell>

      {/* Статус */}
      <TableCell className="align-top pt-3">
        <Badge variant={statusBadge.variant as "default" | "secondary" | "destructive" | "warning" | "success"} className="text-[10px]">
          {statusBadge.label}
        </Badge>
      </TableCell>

      {/* Дата */}
           {/* Дата */}
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap align-top pt-3">
        {report.created_at && formatDateTime(report.created_at)}
        {report.updated_at && report.updated_at !== report.created_at && (
          <div className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">
            ↻ {formatDateTime(report.updated_at)}
          </div>
        )}
      </TableCell>

      {/* Действия */}
      <TableCell className="text-right align-top pt-3">
        {isPending ? (
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="ghost" size="icon-sm" disabled={isAnyPending}>
                {isAnyPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
              </Button>
            }/>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Принять меры (Закрыть жалобу)</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {isUserReport && reportedUser && reportedUser.role === 'user' && (
                  <>
                    {isReportedBanned ? (
                      <DropdownMenuItem
                        onClick={() => banMutation.mutate({ userId: reportedUser.id, type: "permanent", reportId: report.id })}
                      >
                        <Unlock className="w-4 h-4 mr-2 text-green-500" />
                        Разбанить пользователя
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem
                          onClick={() => setConfirmAction({
                            type: "ban",
                            userId: reportedUser.id,
                            banType: "shadow",
                            reportId: report.id,
                            title: "Теневой бан?",
                            description: "Пользователь не будет знать о бане. Его анкета перестанет отображаться в выдаче. Все жалобы будут закрыты.",
                          })}
                        >
                          <EyeOff className="w-4 h-4 mr-2 text-purple-500" />
                          Теневой бан
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setConfirmAction({
                            type: "ban",
                            userId: reportedUser.id,
                            banType: "temp",
                            reportId: report.id,
                            title: "Бан на 3 дня?",
                            description: "Пользователь получит уведомление о бане. Все жалобы будут закрыты.",
                          })}
                        >
                          <Clock className="w-4 h-4 mr-2 text-yellow-500" />
                          Бан на 3 дня
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setConfirmAction({
                            type: "ban",
                            userId: reportedUser.id,
                            banType: "permanent",
                            reportId: report.id,
                            title: "Вечный бан?",
                            description: "Это действие необратимо. Пользователь навсегда потеряет доступ к сервису. Все жалобы будут закрыты.",
                          })}
                        >
                          <Lock className="w-4 h-4 mr-2 text-red-500" />
                          Вечный бан
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                  </>
                )}

                {isPhotoReport && report.photo && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setConfirmAction({
                      type: "photoReject",
                      photoId: report.photo?.id,
                      title: "Отклонить фото?",
                      description: "Фото будет отклонено. Все жалобы на это фото будут закрыты. Владелец получит уведомление.",
                    })}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Отклонить фото
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={() => resolveMutation.mutate({ id: report.id, resolution: "warn" })}
                >
                  <AlertTriangle className="w-4 h-4 mr-2 text-yellow-500" />
                  Вынести предупреждение
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => rejectMutation.mutate(report.id)}
                >
                  <XCircle className="w-4 h-4 mr-2 text-muted-foreground" />
                  Отклонить жалобу (всё ок)
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => reopenMutation.mutate(report.id)}
            disabled={isAnyPending}
            title="Вернуть в очередь"
          >
            {reopenMutation.isPending && reopenMutation.variables === report.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4 text-blue-500" />
            )}
          </Button>
        )}
      </TableCell>
      {/* H2: ConfirmDialog для destructive actions (ban/photo-reject).
          Раньше ban/photo-reject кликались сразу из dropdown — misclick необратим.
          Теперь: dropdown открывает confirm dialog → админ подтверждает → mutation. */}
      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title={confirmAction?.title ?? ""}
        description={confirmAction?.description}
        confirmText="Подтвердить"
        cancelText="Отмена"
        variant="destructive"
        isLoading={isAnyPending}
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.type === "ban") {
            banMutation.mutate(
              { userId: confirmAction.userId!, type: confirmAction.banType as "permanent" | "temp" | "shadow", reportId: confirmAction.reportId },
              { onSettled: () => setConfirmAction(null) }
            );
          } else if (confirmAction.type === "photoReject") {
            rejectPhotoMutation.mutate(
              confirmAction.photoId!,
              { onSettled: () => setConfirmAction(null) }
            );
          }
        }}
      />
    </TableRow>
  );

  // ============================================================
// Хелпер форматирования даты/времени
// ============================================================
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${mins}`;
}
}