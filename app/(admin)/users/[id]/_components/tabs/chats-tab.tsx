"use client";

// app/(admin)/users/[id]/_components/tabs/chats-tab.tsx
//
// Таб «Чаты»: приватные чаты с участием пользователя.
//
// Per-user листинг: GET /admin/users/{userId}/chats?page=
// (UserListingsController::chats, формат айтемов 1:1 с глобальным списком).
// Действия (блокировка чата, просмотр сообщений) — в глобальном разделе
// /communication/chats.

import { ExternalLink, Lock, MessageCircle } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { TabError, TabLoading } from "@/components/admin/tab-states";
import { UserBadge } from "@/components/admin/user-badge";
import { useTabUrl, parsePageParam } from "@/hooks/admin/use-tab-url";
import { useUserChats } from "@/hooks/admin/use-users";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import type { UserBadgeData } from "@/lib/types";

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
    <div className="space-y-6">
      {chats.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12">
          Пользователь не участвует ни в одном чате.
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className="flex items-center gap-4 p-3 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors flex-wrap"
            >
              <MessageCircle className="w-5 h-5 text-muted-foreground shrink-0" />

              <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                {chat.participants.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-2">
                    {i > 0 && <span className="text-muted-foreground text-xs">↔</span>}
                    {p ? (
                      <UserBadge user={p as UserBadgeData} />
                    ) : (
                      <span className="text-sm text-muted-foreground">Юзер удалён</span>
                    )}
                  </span>
                ))}
              </div>

              <div className="min-w-0 max-w-96">
                {chat.last_message ? (
                  <p className="text-xs text-muted-foreground truncate">
                    {chat.last_message.type === "system" && "⚙ "}
                    {chat.last_message.body}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground/60">нет сообщений</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {chat.is_locked && (
                  <Badge variant="destructive" className="gap-1">
                    <Lock className="w-3 h-3" />
                    заблокирован
                  </Badge>
                )}
                <span
                  className="text-xs text-muted-foreground whitespace-nowrap"
                  title={formatDateTime(chat.last_message_at ?? undefined)}
                >
                  {chat.last_message_at ? formatRelativeTime(chat.last_message_at) : "—"}
                </span>
                <Link
                  href="/communication/chats"
                  aria-label="Открыть чат"
                  className="inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
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
