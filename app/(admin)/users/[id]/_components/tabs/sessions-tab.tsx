"use client";

import { useState } from "react";
import {
  History,
  Clock,
  Globe,
  ShieldCheck,
  Power,
  Smartphone,
  Monitor,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useUserDetail,
  useUserSessions,
  useKillSession,
  useKillAllSessions,
} from "@/hooks/admin/use-users";
import { TabLoading, TabError } from "@/components/admin/tab-states";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

interface SessionsTabProps {
  userId: number;
}

export function SessionsTab({ userId }: SessionsTabProps) {
  const {
    data: user,
    isLoading: userLoading,
    isError: userError,
    refetch: refetchUser,
  } = useUserDetail(userId);
  const {
    data: sessions,
    isLoading: sessionsLoading,
    isError: sessionsError,
    refetch: refetchSessions,
  } = useUserSessions(userId);

  const killSession = useKillSession();
  const killAll = useKillAllSessions();

  const [killingId, setKillingId] = useState<string | null>(null);
  // Таргет для ConfirmDialog: "one" | "all" | null.
  // Храним именно режим, а не просто boolean — на случай, если хотим
  // подсветить, какая кнопка триггерила (для loader'а на ней).
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);

  // === СТЕЙТЫ ЗАГРУЗКИ / ОШИБКИ ============================================
  // Раньше тут было `if (userLoading || !user) return "Загрузка..."`.
  // При isError запроса isLoading=false, data=undefined → таб зависал в
  // «Загрузка...» вечно без шанса на retry. Теперь:
  //   isLoading → TabLoading (без retry)
  //   isError   → TabError с кнопкой "Повторить"
  if (userLoading) return <TabLoading label="Загрузка профиля…" />;
  if (userError) {
    return (
      <TabError
        label="Не удалось загрузить профиль"
        onRetry={() => refetchUser()}
      />
    );
  }
  if (!user) return <TabLoading label="Загрузка профиля…" />;

  // === ДЕЙСТВИЯ ============================================================
  // Раньше использовали window.confirm — это блокирует UI тред и выглядит
  // чужеродно в админке. Теперь переиспользуемый ConfirmDialog (как в bans
  // и blocks табах), а сам kill идёт через onConfirm диалога.

  const handleKillSession = (sessionId: string) => {
    setKillingId(sessionId);
    killSession.mutate(
      { userId, sessionId },
      {
        onSettled: () => {
          setKillingId(null);
          setConfirmTarget(null);
        },
      },
    );
  };

  const handleKillAll = () => {
    killAll.mutate(userId, {
      onSettled: () => setConfirmTarget(null),
    });
  };

  const hasSessions = !!sessions && sessions.length > 0;
  const confirmSessionId = confirmTarget && confirmTarget !== "all"
    ? confirmTarget
    : null;

  return (
    <div className="space-y-6">
      {/* === Последний вход === */}
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <History className="w-4 h-4" /> Последний вход в систему
        </h3>

        <div className="p-4 bg-muted/20 rounded-lg border border-border">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">
                {user.last_login_at
                  ? new Date(user.last_login_at).toLocaleString("ru-RU")
                  : "Никогда"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-muted-foreground">
                {user.last_login_ip ?? "Нет данных"}
              </span>
            </div>
          </div>

          {!user.last_login_at && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              Возможно, аккаунт создан через сидер или админку, без реальной авторизации.
            </p>
          )}
        </div>
      </div>

      {/* === Активные сессии === */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Активные сессии
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Устройства, на которых пользователь находится прямо сейчас.
          </p>
        </div>

        {hasSessions && (
          <Button
            variant="destructive"
            size="sm"
            disabled={killAll.isPending}
            onClick={() => setConfirmTarget("all")}
          >
            {killAll.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Power className="w-4 h-4 mr-2" />
            )}
            Завершить все сессии
          </Button>
        )}
      </div>

      {sessionsLoading ? (
        <div className="p-4 bg-muted/20 rounded-lg border border-border">
          <div className="text-sm text-muted-foreground">Загрузка сессий...</div>
        </div>
      ) : sessionsError ? (
        <div className="p-4 bg-muted/20 rounded-lg border border-destructive/30">
          <p className="text-sm text-destructive mb-2">Не удалось загрузить сессии.</p>
          <Button variant="outline" size="sm" onClick={() => refetchSessions()}>
            Повторить
          </Button>
        </div>
      ) : !hasSessions ? (
        <div className="p-4 bg-muted/20 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
          Нет активных сессий. Пользователь сейчас не в сети.
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const isKilling = killingId === session.id && killSession.isPending;
            return (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 bg-card border border-border rounded-lg shadow-xs gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-md bg-muted shrink-0">
                    {session.is_mobile ? (
                      <Smartphone className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Monitor className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{session.device}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{session.browser}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span className="font-mono">{session.ip ?? "—"}</span>
                      <span>•</span>
                      <span title={`Точное время: ${session.exact_time}`}>
                        {session.last_activity}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmTarget(session.id)}
                  disabled={isKilling}
                  className="text-destructive hover:text-destructive shrink-0"
                >
                  {isKilling ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Завершить
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* === Диалог подтверждения kill-session / kill-all ===
          Один переиспользуемый ConfirmDialog на оба действия.
          Режим определяется confirmTarget: "all" | sessionId | null. */}
      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null);
        }}
        variant="destructive"
        title={confirmTarget === "all"
          ? "Завершить все сессии?"
          : "Завершить эту сессию?"}
        description={confirmTarget === "all"
          ? "Пользователь будет немедленно разлогинен на всех устройствах. Используйте при подозрении на взлом аккаунта."
          : "Пользователь будет разлогинен на этом устройстве."}
        confirmText={confirmTarget === "all" ? "Завершить все" : "Завершить"}
        isLoading={
          confirmTarget === "all"
            ? killAll.isPending
            : killSession.isPending
        }
        onConfirm={() => {
          if (confirmTarget === "all") {
            handleKillAll();
          } else if (confirmTarget) {
            handleKillSession(confirmTarget);
          }
        }}
      />
    </div>
  );
}
