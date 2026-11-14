"use client";

// app/(admin)/users/[id]/_components/tabs/chats-tab.tsx
//
// Таб «Чаты»: приватные чаты с участием пользователя.
//
// Per-user листинг: GET /admin/users/{userId}/chats?page=
// (UserListingsController::chats —composite-строка: partner + participant_state).
// Действия (блокировка чата, чтение сообщений) — в глобальном разделе
// /communication/chats (или /communication/support для support-чатов).
//
// Зеркало blade-эталона: в строке — #id (ссылка на модерацию по q=chat.id),
// тип чата (private/support), собеседник (partner ≠ userId), последнее
// сообщение, бейджи статусов (unread/archive/mute/block/locked), дата.

import { ExternalLink, EyeOff, BellOff, Ban, Lock, MessageCircle } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { TabError, TabLoading } from "@/components/admin/tab-states";
import { UserBadge } from "@/components/admin/user-badge";
import { useTabUrl, parsePageParam } from "@/hooks/admin/use-tab-url";
import { useUserChats } from "@/hooks/admin/use-users";
import { formatRelativeTime } from "@/lib/format";
import type { UserBadgeData } from "@/lib/types";
import type { UserChatItem } from "@/lib/api/users";

interface ChatsTabProps {
  userId: number;
}

export function ChatsTab({ userId }: ChatsTabProps) {
  const basePath = `/users/${userId}/chats`;
  const { searchParams, replace } = useTabUrl(basePath);

  const page = parsePageParam(searchParams);

  const { data, isLoading, isError, refetch } = useUserChats(userId, { page });

  if (isLoading || !data) return <TabLoading label="Загрузка чатов..." />;
  if (isError) return <TabError label="Не удалось загрузить чаты" onRetry={refetch} />;

  const chats = data.data;

  return (
    <div className="space-y-4">
      {chats.length === 0 ? (
        <div className="p-4 bg-muted/20 rounded-lg border border-border text-center text-xs text-muted-foreground">
          Пользователь пока не начал ни одного диалога.
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((row) => {
            const chat = row.chat;
            if (!chat) return null;

            // Маршрут модерации: support-чаты — отдельный раздел.
            const chatRoute =
              chat.type === "support"
                ? `/communication/support?q=${chat.id}`
                : `/communication/chats?q=${chat.id}`;

            const st = row.participant_state;
            const lastMsg = chat.last_message;

            return (
              <div
                key={row.participant_id}
                className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors flex-wrap"
              >
                {/* #id чата → модерация */}
                <Link
                  href={chatRoute}
                  className="text-xs font-mono text-blue-500 hover:underline font-medium shrink-0"
                  title="Открыть переписку"
                >
                  #{chat.id}
                </Link>

                <MessageCircle className="w-4 h-4 text-muted-foreground shrink-0" />

                {/* Собеседник */}
                <div className="flex-1 min-w-0">
                  {row.partner ? (
                    <Link href={`/users/${row.partner.id}`} className="hover:opacity-80 transition-opacity">
                      <UserBadge user={row.partner as UserBadgeData} />
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Собеседник удален</span>
                  )}
                </div>

                {/* Тип чата */}
                <Badge variant={chat.type === "support" ? "secondary" : "outline"} className="shrink-0">
                  {chat.type === "support" ? "Поддержка" : "Приватный"}
                </Badge>

                {/* Последнее сообщение */}
                <div className="min-w-0 max-w-[200px]">
                  {lastMsg ? (
                    <p className="text-xs text-muted-foreground italic truncate">
                      {lastMsg.type === "system" ? "⚙ Системное сообщение" : `"${lastMsg.body}"`}
                    </p>
                  ) : (
                    <span className="text-xs text-muted-foreground/50 italic">Нет сообщений</span>
                  )}
                </div>

                {/* Бейджи статусов участника */}
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {st.unread_count > 0 && (
                    <Badge variant="destructive">{st.unread_count} непроч.</Badge>
                  )}
                  {st.is_hidden && (
                    <Badge variant="secondary" className="gap-1" title="Чат скрыт (в архиве)">
                      <EyeOff className="w-3 h-3" /> Архив
                    </Badge>
                  )}
                  {st.is_muted && (
                    <Badge variant="warning" className="gap-1" title="Уведомления отключены">
                      <BellOff className="w-3 h-3" /> Мьют
                    </Badge>
                  )}
                  {st.is_blocked && (
                    <Badge variant="destructive" className="gap-1" title="Юзер заблокировал собеседника">
                      <Ban className="w-3 h-3" /> Блок
                    </Badge>
                  )}
                  {chat.is_locked && (
                    <Badge variant="destructive" className="gap-1" title="Чат заблокирован администрацией">
                      <Lock className="w-3 h-3" /> Заблок.
                    </Badge>
                  )}
                </div>

                {/* Дата */}
                <span
                  className="text-xs text-muted-foreground whitespace-nowrap shrink-0"
                  title={chat.last_message_at ?? undefined}
                >
                  {chat.last_message_at ? formatRelativeTime(chat.last_message_at) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <MiniPagination
        currentPage={data.current_page}
        lastPage={data.last_page}
        from={data.from}
        to={data.to}
        total={data.total}
        onChangePage={(next) => replace((p) => (next <= 1 ? p.delete("page") : p.set("page", String(next))))}
      />

      <div className="text-xs text-muted-foreground">
        <ExternalLink className="w-3.5 h-3.5 inline mr-1" />
        <Link
          href="/communication/chats"
          className="hover:text-foreground underline underline-offset-2"
        >
          Читать сообщения и управлять чатами в разделе «Чаты»
        </Link>
      </div>
    </div>
  );
}
