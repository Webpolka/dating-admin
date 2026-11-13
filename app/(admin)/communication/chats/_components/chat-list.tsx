// app/(admin)/communication/chats/_components/chat-list.tsx
"use client";

import { RefObject } from "react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListPagination } from "@/components/admin/list-pagination";
import { UserBadge } from "@/components/admin/user-badge";
import { Lock, Loader2, MessagesSquare, Circle } from "lucide-react";
import type { ChatListItem } from "@/hooks/admin/use-chats";
import {
  DeletedUserBadge, ErrorState, renderLastMessagePreview,
} from "./chat-shared";

// ============================================================
// Список чатов (левая панель)
// ============================================================
export function ChatList({
  items,
  counts,
  page,
  lastPage,
  isLoading,
  isFetching,
  isError,
  isFirstLoad,
  showEmpty,
  activeChatId,
  searchedId,
  isIdSearch,
  lockFilter,
  activeListItemRef,
  onSelectChat,
  onSetLockFilter,
  onSetPage,
  onRetry,
}: {
  items: ChatListItem[];
  counts: { total: number; locked: number; unlocked: number } | undefined;
  page: number;
  lastPage: number | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isFirstLoad: boolean;
  showEmpty: boolean;
  activeChatId: number | null;
  searchedId: number | null;
  isIdSearch: boolean;
  lockFilter: string;
  activeListItemRef: RefObject<HTMLDivElement | null>;
  onSelectChat: (chatId: number) => void;
  onSetLockFilter: (filter: string) => void;
  onSetPage: (page: number | ((p: number) => number)) => void;
  onRetry: () => void;
}) {
  return (
    <div className="lg:col-span-1 lg:border-r border-border lg:pr-4 flex flex-col h-[calc(100vh-16rem)]">
      {/* Фильтр блокировки — flex-wrap для адаптива (на мобилке переносятся) */}
      <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
        <Button
          variant={lockFilter === "all" ? "default" : "secondary"}
          size="sm"
          onClick={() => onSetLockFilter("all")}
          className="flex-1 min-w-22.5 text-xs gap-1.5"
          title="Все чаты"
        >
          <MessagesSquare className="w-3.5 h-3.5" />
          Все
          <Badge variant="secondary" className="text-[10px] h-4 px-1">
            {counts?.total ?? 0}
          </Badge>
        </Button>
        <Button
          variant={lockFilter === "unlocked" ? "default" : "secondary"}
          size="sm"
          onClick={() => onSetLockFilter("unlocked")}
          className="flex-1 min-w-22.5 text-xs gap-1.5"
          title="Активные чаты"
        >
          <Circle className="w-3.5 h-3.5" />
          Активные
          <Badge variant="secondary" className="text-[10px] h-4 px-1">
            {counts?.unlocked ?? 0}
          </Badge>
        </Button>
        <Button
          variant={lockFilter === "locked" ? "destructive" : "secondary"}
          size="sm"
          onClick={() => onSetLockFilter("locked")}
          className="flex-1 min-w-22.5 text-xs gap-1.5"
          title="Заблокированные чаты"
        >
          <Lock className="w-3.5 h-3.5" />
          Заблок.
          <Badge variant="secondary" className="text-[10px] h-4 px-1">
            {counts?.locked ?? 0}
          </Badge>
        </Button>
      </div>

      {/* Список чатов */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 little-scroll">
        {isFirstLoad ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <ErrorState onRetry={onRetry} />
        ) : showEmpty ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Чаты не найдены
          </div>
        ) : (
          items.map((chat) => {
            const u1 = chat.participants[0];
            const u2 = chat.participants[1];
            const isActive = chat.id === activeChatId;
            const isFound = isIdSearch && chat.id === searchedId;
            const lastMsg = chat.last_message;

            return (
              <div
                key={chat.id}
                ref={isActive ? activeListItemRef : undefined}
                onClick={() => onSelectChat(chat.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                  isActive
                    ? "border-blue-500 ring-2 ring-blue-500/50"
                    : isFound
                      ? "bg-blue-500/5 border-blue-500/40 ring-1 ring-blue-500/20"
                      : "bg-muted/30 hover:bg-muted border-transparent"
                } ${chat.is_locked && !isActive ? "border-destructive/20" : ""}`}
              >
                <div className="flex flex-col gap-2">
                  {/* Участники чата — вертикально, compact (без email в списке).
                      Раньше были в один ряд (gap-6) — cramped, некрасиво сканировалось.
                      Теперь u1 сверху, u2 снизу — visual hierarchy лучше. */}
                  <div className="flex items-center justify-between gap-1.5 min-w-0">
                    {u1 ? (
                      <UserBadge user={u1} size="sm" />
                    ) : (
                      <DeletedUserBadge size="sm" />
                    )}                    
                    {u2 ? (
                      <UserBadge user={u2} size="sm" />
                    ) : (
                      <DeletedUserBadge size="sm" />
                    )}
                  </div>

                  {/* Превью последнего сообщения */}
                  <span className="inline-block text-xs text-muted-foreground max-w-full truncate p-2 border-t border-border">
                    {renderLastMessagePreview(lastMsg)}
                  </span>

                  {/* Footer: lock badge (если есть) + время и ID чата справа.
                      Lock слева отдельно — не смешивается с метаданными. */}
                  <div className="flex items-center justify-between gap-2">
                    {chat.is_locked ? (
                      <Badge variant="destructive" className="text-[10px] h-5 px-1 gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> Заблок.
                      </Badge>
                    ) : (
                      <span />
                    )}
                    <div className="flex items-center gap-2 shrink-0">
                      {chat.last_message_at && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(chat.last_message_at), {
                            addSuffix: false,
                            locale: ru,
                          })}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm whitespace-nowrap font-mono">
                        Чат #{chat.id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Пагинация */}
      {lastPage !== undefined && lastPage > 1 && (
        <div className="shrink-0 pt-4 mt-2 border-t border-border">
          <ListPagination
            currentPage={page}
            lastPage={lastPage}
            onChangePage={onSetPage}
            disabled={isFetching}
          />
        </div>
      )}
    </div>
  );
}