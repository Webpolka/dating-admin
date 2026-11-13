// app/(admin)/communication/chats/_components/chat-detail-panel.tsx
"use client";

import { useRef, useState, useCallback, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { UserBadge } from "@/components/admin/user-badge";
import { Lock, Unlock, Loader2, MessageCircle } from "lucide-react";
import {
  useChatDetail,
  useToggleChatLock,
  useLoadMoreMessages,
} from "@/hooks/admin/use-chats";
import { MessageBubble } from "./message-bubble";
import { DeletedUserBadge, ErrorState, LoadMoreButton } from "./chat-shared";

const SCROLL_TOP_THRESHOLD = 5;

// ============================================================
// Панель деталей чата (правая часть)
// ============================================================
export function ChatDetailPanel({ chatId }: { chatId: number }) {
  const { data: chat, isLoading, isError, refetch } = useChatDetail(chatId, true);
  const lockMutation = useToggleChatLock();
  const loadMoreMutation = useLoadMoreMessages(chatId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(true);
  // Сохраняем позицию скролла ДО подгрузки, чтобы восстановить ПОСЛЕ.
  // После подгрузки новые (старые) сообщения добавляются ВВЕРХ, scrollHeight
  // растёт. Восстанавливаем: scrollTop = oldScrollTop + diff.
  // Юзер остаётся на том же сообщении, прыжка нет.
  const pendingScrollRestoreRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);

  // Отслеживаем смену чата внутри useLayoutEffect (а не отдельным useEffect),
  // чтобы избежать бага: useEffect сброса срабатывал ПОСЛЕ useLayoutEffect
  // и снова ставил isFirstLoadRef = true.
  const prevChatIdRef = useRef<number | null>(null);

  const [isAtTop, setIsAtTop] = useState(false);

  const u1 = chat?.participants[0] ?? null;
  const u2 = chat?.participants[1] ?? null;

  const chatIdentity = chat?.id;
  const messagesCount = chat?.messages.length ?? 0;
  // firstMessageId — чтобы effect срабатывал при подгрузке старых
  // (последнее сообщение то же, но первое меняется)
  const firstMessageId = chat?.messages[0]?.id ?? null;

  // --- Единый useLayoutEffect: обработка всех сценариев ---
  // 1. Смена чата → сброс + автоскролл вниз
  // 2. Первая загрузка → автоскролл вниз
  // 3. Подгрузка старых → сохранение позиции скролла (без прыжка)
  useLayoutEffect(() => {
    if (!chatIdentity) return;

    // Смена чата?
    if (prevChatIdRef.current !== chatIdentity) {
      prevChatIdRef.current = chatIdentity;
      isFirstLoadRef.current = true;
      pendingScrollRestoreRef.current = null;
      setIsAtTop(false);
    }

    if (isFirstLoadRef.current) {
      // Первая загрузка чата — скроллим вниз к последнему сообщению
      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      isFirstLoadRef.current = false;
      if (messagesContainerRef.current) {
        setIsAtTop(messagesContainerRef.current.scrollTop <= SCROLL_TOP_THRESHOLD);
      }
    } else if (pendingScrollRestoreRef.current !== null && messagesContainerRef.current) {
      // Подгрузка старых — восстанавливаем позицию скролла.
      // До запроса мы запомнили scrollHeight и scrollTop. После подгрузки
      // новые (старые) сообщения добавились ВВЕРХ, scrollHeight вырос.
      // Восстанавливаем: scrollTop = oldScrollTop + diff.
      // Юзер остаётся на том же сообщении, прыжка нет.
      const container = messagesContainerRef.current;
      const saved = pendingScrollRestoreRef.current;
      const newScrollHeight = container.scrollHeight;
      const diff = newScrollHeight - saved.scrollHeight;
      container.scrollTop = saved.scrollTop + diff;
      pendingScrollRestoreRef.current = null;
      // После подгрузки юзер точно не в самом верху — кнопка исчезнет
      setIsAtTop(false);
    }
  }, [chatIdentity, messagesCount, firstMessageId]);

  // onScroll: отслеживаем, в самом ли верху юзер
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    setIsAtTop(container.scrollTop <= SCROLL_TOP_THRESHOLD);
  }, []);

  // Обработчик «Загрузить ещё» — запоминаем позицию скролла ДО запроса.
  // После подгрузки useLayoutEffect восстановит позицию.
  const handleLoadMore = async () => {
    const container = messagesContainerRef.current;
    if (container) {
      pendingScrollRestoreRef.current = {
        scrollHeight: container.scrollHeight,
        scrollTop: container.scrollTop,
      };
    }
    await loadMoreMutation.mutateAsync(chatId);
  };

  // --- Загрузка / ошибка ---
  if (isLoading || !chat) {
    if (isError) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <ErrorState onRetry={refetch} />
        </div>
      );
    }
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasMore = chat.messages_meta?.has_more ?? false;

  return (
    <>
      {/* Шапка чата */}
      <div className="flex items-center justify-between border-b border-border gap-4 pb-3 mb-4">
        {/* User 1 — кликабельный */}
        <a
          href={u1 ? `/admin/users/${u1.id}` : "#"}
          className={`min-w-0 ${u1 ? "hover:opacity-80 transition-opacity cursor-pointer" : "cursor-default"}`}
          onClick={(e) => { if (!u1) e.preventDefault(); }}
        >
          {u1 ? <UserBadge user={u1} size="md" /> : <DeletedUserBadge size="md" />}
        </a>

        {/* Кнопка блокировки */}
        {chat.is_locked ? (
          <Button
            variant="default"
            size="sm"
            onClick={() => lockMutation.mutate(chat.id)}
            disabled={lockMutation.isPending}
          >
            {lockMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Unlock className="w-4 h-4" />
            )}
            Разблокировать
          </Button>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => lockMutation.mutate(chat.id)}
            disabled={lockMutation.isPending}
          >
            {lockMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            Заблокировать
          </Button>
        )}

        {/* User 2 — кликабельный */}
        <a
          href={u2 ? `/admin/users/${u2.id}` : "#"}
          className={`min-w-0 ${u2 ? "hover:opacity-80 transition-opacity cursor-pointer" : "cursor-default"}`}
          onClick={(e) => { if (!u2) e.preventDefault(); }}
        >
          {u2 ? <UserBadge user={u2} size="md" /> : <DeletedUserBadge size="md" />}
        </a>
      </div>

      {/* Лента сообщений */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-4 pr-2 little-scroll flex flex-col max-h-[calc(100vh-23rem)]"
      >
        {/* Кнопка «Загрузить ещё» — ТОЛЬКО когда юзер в самом верху И есть ещё */}
        {hasMore && isAtTop && (
          <LoadMoreButton
            onLoadMore={handleLoadMore}
            isLoading={loadMoreMutation.isPending}
          />
        )}

        {/* Сообщения */}
        {chat.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} u1Id={u1?.id ?? null} />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </>
  );
}

// ============================================================
// Empty state — когда чат не выбран
// ============================================================
export function ChatDetailEmpty() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
      <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
      <h3 className="text-lg font-medium">Выберите чат</h3>
      <p className="text-sm">Нажмите на диалог слева, чтобы просмотреть переписку.</p>
    </div>
  );
}