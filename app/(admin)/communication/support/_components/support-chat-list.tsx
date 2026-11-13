// app/(admin)/communication/support/_components/support-chat-list.tsx
"use client";

import { type RefObject } from "react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ListPagination } from "@/components/admin/list-pagination";
import { UserBadge } from "@/components/admin/user-badge";
import {
  Inbox, AlertCircle, MessageSquare, Archive, Search, X, Loader2,
} from "lucide-react";
import type { SupportChatListItem } from "@/hooks/admin/use-support-chats";
import { stripMarkdown } from "@/components/admin/message-content";
import {
  DeletedUserBadge, ErrorState, extractErrorMessageSafe,
} from "./support-shared";

type ChatFilter = "all" | "unread" | "active" | "archived";

// ============================================================
// Список тикетов поддержки (левая панель)
// ============================================================
export function SupportChatList({
  items,
  counts,
  page,
  lastPage,
  isLoading,
  isFetching,
  isError,
  error,
  isFirstLoad,
  showEmpty,
  filter,
  activeChatId,
  activeListItemRef,
  onSelectChat,
  onSetFilter,
  onSetPage,
  onRetry,
  search,
  onSearchChange,
  onClearSearch,
}: {
  items: SupportChatListItem[];
  counts: { all: number; active: number; unread: number; archived: number } | undefined;
  page: number;
  lastPage: number | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  isFirstLoad: boolean;
  showEmpty: boolean;
  filter: ChatFilter;
  activeChatId: number | null;
  activeListItemRef: RefObject<HTMLDivElement | null>;
  onSelectChat: (chatId: number) => void;
  onSetFilter: (filter: ChatFilter) => void;
  onSetPage: (page: number | ((p: number) => number)) => void;
  onRetry: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
}) {
  return (
    <div className="lg:col-span-1 lg:border-r border-border lg:pr-4 flex flex-col h-[calc(100vh-16rem)]">
      {/* Фильтры */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex gap-1.5 flex-wrap">
          <Button
            variant={filter === "all" ? "default" : "secondary"}
            size="sm"
            onClick={() => onSetFilter("all")}
            className="text-xs gap-1.5"
            title="Все чаты"
          >
            <Inbox className="w-3.5 h-3.5" />
            Все
            <Badge variant="secondary" className="text-[10px] h-4 px-1">{counts?.all ?? 0}</Badge>
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "secondary"}
            size="sm"
            onClick={() => onSetFilter("unread")}
            className="text-xs gap-1.5"
            title="Требуют ответа"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Непрочитанные
            <Badge variant={counts && counts.unread > 0 ? "destructive" : "secondary"} className="text-[10px] h-4 px-1">
              {counts?.unread ?? 0}
            </Badge>
          </Button>
          <Button
            variant={filter === "active" ? "default" : "secondary"}
            size="sm"
            onClick={() => onSetFilter("active")}
            className="text-xs gap-1.5"
            title="Активные"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Активные
            <Badge variant="secondary" className="text-[10px] h-4 px-1">{counts?.active ?? 0}</Badge>
          </Button>
          <Button
            variant={filter === "archived" ? "default" : "secondary"}
            size="sm"
            onClick={() => onSetFilter("archived")}
            className="text-xs gap-1.5"
            title="Архив"
          >
            <Archive className="w-3.5 h-3.5" />
            <Badge variant="secondary" className="text-[10px] h-4 px-1">{counts?.archived ?? 0}</Badge>
          </Button>
        </div>
      </div>

      {/* Поиск */}
      <div className="relative mb-3 shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
        <Input
          type="search"
          placeholder="Поиск по имени или id тикета..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-8"
        />
        {search && (
          <button
            onClick={onClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Список тикетов */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 little-scroll">
        {isFirstLoad ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <ErrorState
            onRetry={onRetry}
            message={extractErrorMessageSafe(error, "Не удалось загрузить тикеты")}
          />
        ) : showEmpty ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {filter === "unread" && <p>Непрочитанных тикетов нет</p>}
            {filter === "archived" && <p>Архив пуст</p>}
            {filter === "active" && <p>Активных тикетов нет</p>}
            {filter === "all" && <p>Тикетов пока нет</p>}
          </div>
        ) : (
          items.map((chat) => {
            const partner = chat.partner;
            const lastMsg = chat.last_message;
            const isActive = chat.id === activeChatId;
            const hasUnread = chat.staff_unread_count > 0;

            return (
              <div
                key={chat.id}
                ref={isActive ? activeListItemRef : undefined}
                onClick={() => onSelectChat(chat.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors relative overflow-hidden border ${
                  isActive
                    ? "border-blue-500 ring-2 ring-blue-500/50"
                    : hasUnread
                      ? "bg-red-500/5 border-red-500/30 hover:bg-red-500/10"
                      : "bg-muted/30 hover:bg-muted border-transparent"
                }`}
              >
                {hasUnread && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500" />}

                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {partner ? (
                        <UserBadge user={partner} size="sm" showEmail={true} />
                      ) : (
                        <DeletedUserBadge size="sm" />
                      )}
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-1">
                      {chat.last_message_at && (
                        <span className={`text-[10px] whitespace-nowrap ${hasUnread ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                          {formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: false, locale: ru })}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded-sm whitespace-nowrap font-mono">
                        #{chat.id}
                      </span>
                      {hasUnread && (
                        <span className="bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                          {chat.staff_unread_count}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className={`text-xs line-clamp-2 ${hasUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {lastMsg ? (
                      lastMsg.type === "system" ? "Системное сообщение" : stripMarkdown(lastMsg.body ?? "").slice(0, 120)
                    ) : (
                      <span className="italic">Нет сообщений</span>
                    )}
                  </p>

                  {/* Subtle «кто последний раз прочитал» — для прочитанных тикетов.
                      Помогает понять кто из команды уже работал с тикетом. */}
                  {!hasUnread && chat.staff_last_read_by && (
                    <p className="text-[10px] text-muted-foreground/70 truncate italic">
                      Прочитал {chat.staff_last_read_by.name}
                    </p>
                  )}
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