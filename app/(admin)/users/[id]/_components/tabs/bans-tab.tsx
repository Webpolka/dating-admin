"use client";

import { useState } from "react";
import {
  Info,
  ShieldCheck,
  ShieldX,
  Ban,
  Unlock,
  EyeOff,
  Trash2,
  RotateCcw,
  History,
  Loader2,
  CheckCircle,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { TabLoading, TabError } from "@/components/admin/tab-states";
import {
  BAN_REASONS,
  type BanReason,
  type BanType,
  type BanHistoryEntry,
} from "@/lib/api/users";
import {
  useUserDetail,
  useUserBanHistory,
  useBanUser,
  useUnbanUser,
} from "@/hooks/admin/use-users";

interface BansTabProps {
  userId: number;
}

// Опции типа блокировки. Вынесены из компонента — стабильная ссылка,
// не пересоздаётся на каждый рендер.
const BAN_TYPE_OPTIONS: ReadonlyArray<{ value: BanType; label: string }> = [
  { value: "shadow", label: "Теневой бан" },
  { value: "temp", label: "Бан на 3 дня" },
  { value: "permanent", label: "Вечный бан" },
] as const;

export function BansTab({ userId }: BansTabProps) {
  // useUserDetail кешируется по ["user-detail", userId] —
  // тот же ключ, что и в layout.tsx, лишних запросов нет.
  const { data: user, isLoading, isError, refetch } = useUserDetail(userId);
  const {
    data: history,
    isLoading: historyLoading,
    isError: historyError,
    isFetching: historyFetching,
    refetch: refetchHistory,
  } = useUserBanHistory(userId);

  const ban = useBanUser();
  const unban = useUnbanUser();

  // Локальный UI-стейт: выбранная причина/тип для формы бана + флаг confirm-диалога анбана.
  const [banReason, setBanReason] = useState<BanReason | "">("");
  const [banType, setBanType] = useState<BanType>("permanent");
  const [unbanConfirmOpen, setUnbanConfirmOpen] = useState(false);

  // Пока нет данных о юзере — показываем стандартизованный лоадер или ошибку с retry.
  // Раньше тут было `if (isLoading || !user) return "Загрузка..."` —
  // при isError пользователь зависал в "Загрузка..." навсегда.
  if (isLoading) return <TabLoading label="Загрузка профиля…" />;
  if (isError || !user) {
    return <TabError onRetry={() => refetch()} label="Не удалось загрузить профиль" />;
  }

  const isBanned = user.status === "banned" || user.status === "shadowbanned";
  const canApplyBan = banReason !== "";

  const handleApplyBan = () => {
    if (banReason === "") return;
    ban.mutate({ userId, type: banType, reason: banReason });
    // Сбрасываем форму — иначе при повторном открытии таба останется старый выбор.
    setBanReason("");
    setBanType("permanent");
  };

  const handleUnbanConfirm = () => {
    unban.mutate(userId, {
      onSuccess: () => setUnbanConfirmOpen(false),
    });
  };

  const statusConfig = getStatusConfig(user.status);

  return (
    <div className="space-y-6">
      {/* 1 + 2: СТАТУС И ДЕЙСТВИЯ В ДВЕ КОЛОНКИ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* 1. ТЕКУЩИЙ СТАТУС */}
        <div className="p-4 bg-muted/20 rounded-lg border border-border h-full">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" /> Текущий статус аккаунта
          </h3>

          <div className="flex items-center gap-4 flex-wrap">
            <Badge variant={statusConfig.variant as never} className="gap-1.5">
              <statusConfig.icon className="w-4 h-4" />
              {statusConfig.label}
            </Badge>

            {isBanned && (
              <div className="text-sm text-muted-foreground space-y-1">
                {user.ban_reason && (
                  <span className="block">
                    Причина: <span className="text-foreground font-medium">{user.ban_reason}</span>
                  </span>
                )}

                {user.banned_until ? (
                  <span className="block">
                    Истекает:{" "}
                    <span className="text-foreground font-medium">
                      {new Date(user.banned_until).toLocaleString("ru-RU")}
                    </span>
                  </span>
                ) : (
                  <span className="block text-destructive font-medium">Бессрочно</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. ДЕЙСТВИЯ */}
        <div className="h-full">
          {isBanned ? (
            <div className="p-4 border border-green-500/30 rounded-lg bg-green-500/5 h-full flex flex-col">
              <h3 className="text-sm font-semibold mb-3 text-green-600 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Снять ограничения
              </h3>
              <p className="text-xs text-muted-foreground mb-3 flex-grow">
                Полностью снять бан/теневой бан и восстановить аккаунт. Пользователь снова сможет заходить в приложение.
              </p>
              <Button
                variant="default"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setUnbanConfirmOpen(true)}
                disabled={unban.isPending}
              >
                {unban.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Unlock className="w-4 h-4 mr-2" />
                )}
                Разбанить
              </Button>
            </div>
          ) : (
            <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/5 h-full flex flex-col">
              <h3 className="text-sm font-semibold mb-1 text-destructive flex items-center gap-2">
                <ShieldX className="w-4 h-4" /> Заблокировать пользователя
              </h3>

              <div className="space-y-4 flex-grow mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground tracking-wider">
                      Причина <span className="text-destructive">*</span>
                    </label>
                    <Select value={banReason} onValueChange={(v) => setBanReason(v as BanReason)}>
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {(v: string) =>
                            v === ""
                              ? "Выберите причину"
                              : BAN_REASONS.find((r) => r.value === v)?.label ?? v
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {BAN_REASONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground tracking-wider">
                      Тип блокировки
                    </label>
                    <Select value={banType} onValueChange={(v) => setBanType(v as BanType)}>
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {(v: string) =>
                            BAN_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {BAN_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button
                variant="destructive"
                className="w-full mt-4"
                onClick={handleApplyBan}
                disabled={ban.isPending || !canApplyBan}
              >
                {ban.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Ban className="w-4 h-4 mr-2" />
                )}
                Применить блокировку
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 3. ИСТОРИЯ МОДЕРАЦИИ */}
      <BanHistoryTimeline
        entries={history?.data ?? []}
        isLoading={historyLoading}
        isError={historyError}
        isFetching={historyFetching}
        onRetry={() => refetchHistory()}
      />

      {/* Диалог подтверждения анбана — переиспользуемый ConfirmDialog,
          тот же, что в blocks-tab и profile-tab. Единый UX. */}
      <ConfirmDialog
        open={unbanConfirmOpen}
        onOpenChange={setUnbanConfirmOpen}
        title="Снять блокировку?"
        description="Пользователь снова сможет заходить в приложение. Действие можно отменить только новой блокировкой."
        confirmText="Разбанить"
        variant="default"
        isLoading={unban.isPending}
        onConfirm={handleUnbanConfirm}
      />
    </div>
  );
}

// ============================================
// ИСТОРИЯ — ТАЙМЛАЙН
// ============================================

interface BanHistoryTimelineProps {
  entries: BanHistoryEntry[];
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  onRetry: () => void;
}

function BanHistoryTimeline({
  entries,
  isLoading,
  isError,
  isFetching,
  onRetry,
}: BanHistoryTimelineProps) {
  // Стандартизованные стейты: loading / error+retry / empty / data.
  if (isLoading) return <TabLoading label="Загрузка истории…" className="border border-border rounded-lg bg-muted/20" />;
  if (isError) {
    return (
      <TabError
        onRetry={onRetry}
        label="Не удалось загрузить историю модерации"
        className="border border-border rounded-lg bg-muted/20"
      />
    );
  }

  if (entries.length === 0) {
    return (
      <div className="p-4 bg-muted/20 rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
        История пуста. Пользователь никогда не получал санкций.
      </div>
    );
  }

  return (
    <div className="p-4 bg-muted/20 rounded-lg border border-border">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <History className="w-4 h-4" /> История модерации
        {isFetching && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
      </h3>

      <div className="space-y-4 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-border">
        {entries.map((log) => {
          const meta = getLogMeta(log);
          const Icon = meta.icon;
          // Причина приходит ТОЛЬКО в after.ban_reason (бэк пишет в AdminLog::$after).
          // Раньше тут был сломанный двойной условный рендер + обращение к
          // `banReason` из родительского скоупа — этого пропа в Timeline просто нет.
          const banReasonText = readBanReason(log);

          return (
            <div key={log.id} className="flex gap-4 items-start relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0 ${meta.iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 pt-1">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{meta.title}</span>
                    <Badge variant={meta.badge.variant as never} className="text-[10px]">
                      {meta.badge.label}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(log.created_at).toLocaleString("ru-RU")}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground">
                  {banReasonText && (
                    <>
                      Причина: <span className="text-foreground">{banReasonText}</span>
                      <br />
                    </>
                  )}

                  {meta.period && (
                    <>
                      {meta.period}
                      <br />
                    </>
                  )}

                  {log.ip_address && (
                    <>
                      IP: <span className="text-foreground">{log.ip_address}</span>
                      <br />
                    </>
                  )}

                  Админ:{" "}
                  {log.admin ? (
                    <Link
                      href={`/users/${log.admin.id}`}
                      className="text-primary hover:underline"
                    >
                      {log.admin.name}
                    </Link>
                  ) : (
                    "Система"
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// ХЕЛПЕРЫ
// ============================================

/**
 * Безопасно достаёт причину бана из AdminLog.after.
 * Бэк пишет её под ключами `ban_reason` (большинство действий) —
 * поддерживаем оба варианта на случай расширения набора действий.
 */
function readBanReason(log: BanHistoryEntry): string | null {
  const after = (log.after ?? {}) as Record<string, unknown>;
  const raw = (after.ban_reason as string | null | undefined) ?? null;
  return raw && raw.trim() !== "" ? raw : null;
}

/**
 * Конфиг badge+иконки для текущего статуса юзера.
 * Используется в шапке "Текущий статус аккаунта".
 */
function getStatusConfig(status: string): {
  variant: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
} {
  switch (status) {
    case "active":
      return { variant: "success", label: "Активен", icon: CheckCircle };
    case "banned":
      return { variant: "destructive", label: "Забанен", icon: Ban };
    case "shadowbanned":
      return { variant: "warning", label: "Теневой бан", icon: EyeOff };
    default:
      return { variant: "secondary", label: status, icon: HelpCircle };
  }
}

/**
 * Превращает одну запись AdminLog в описание для таймлайна:
 * иконку, цвет, заголовок, badge и период действия (для временных банов).
 * Все поля — derived от log.action и log.after, чистая функция.
 */
function getLogMeta(log: BanHistoryEntry): {
  title: string;
  badge: { variant: string; label: string };
  period: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
} {
  const after = (log.after ?? {}) as Record<string, unknown>;
  const banType = (after.ban_type as string) ?? null;
  const status = (after.status as string) ?? null;

  // Дефолты — считаем "баном", если не распознали действие.
  let title = "Действие";
  let badge: { variant: string; label: string } = { variant: "secondary", label: "Действие" };
  let period = "";
  let icon: React.ComponentType<{ className?: string }> = Ban;
  let iconColor = "text-destructive bg-destructive/10";

  if (log.action === "user.unban") {
    title = "Разблокирован";
    badge = { variant: "success", label: "Разбан" };
    icon = Unlock;
    iconColor = "text-green-500 bg-green-500/10";
  } else if (log.action === "user.restore") {
    title = "Аккаунт восстановлен";
    badge = { variant: "success", label: "Восстановление" };
    icon = RotateCcw;
    iconColor = "text-green-500 bg-green-500/10";
  } else if (log.action === "user.delete" || log.action === "user.mass_delete") {
    title = "Деактивирован";
    badge = { variant: "secondary", label: "Удален" };
    icon = Trash2;
    iconColor = "text-muted-foreground bg-muted";
  } else {
    // user.ban | user.shadowban | user.mass_ban
    if (banType === "shadow" || status === "shadowbanned") {
      title = "Теневой бан";
      badge = { variant: "warning", label: "Теневой" };
      icon = EyeOff;
      iconColor = "text-purple-500 bg-purple-500/10";
    } else if (banType === "temp" || after.banned_until) {
      title = "Временный бан";
      const startDate = new Date(log.created_at);
      const endDateStr = after.banned_until as string | undefined;
      const endDate = endDateStr ? new Date(endDateStr) : null;
      const days = endDate
        ? Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      badge = { variant: "destructive", label: `На ${days} дн.` };
      if (endDate) {
        period = `С: ${startDate.toLocaleString("ru-RU")} | По: ${endDate.toLocaleString("ru-RU")}`;
      }
    } else {
      title = "Заблокирован";
      badge = { variant: "destructive", label: "Вечный" };
    }
  }

  return { title, badge, period, icon, iconColor };
}
