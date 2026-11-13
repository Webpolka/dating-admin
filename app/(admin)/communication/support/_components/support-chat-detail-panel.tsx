// app/(admin)/communication/support/_components/support-chat-detail-panel.tsx
"use client";

import { useRef, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { UserBadge } from "@/components/admin/user-badge";
import { useAdminUser } from "@/components/admin/admin-user-context";
import type { UserBadgeData } from "@/lib/types";
import {
  CheckCheck, Archive, ArchiveRestore, Loader2, Inbox, Unlock,
} from "lucide-react";
import {
  useSupportChatDetail,
  useMarkSupportAsRead,
  useArchiveSupportChat,
  useUnarchiveSupportChat,
  useSendSupportMessage,
  useLoadMoreSupportMessages,
} from "@/hooks/admin/use-support-chats";
import { SupportMessageBubble } from "./support-message-bubble";
import { MessageInput } from "./support-message-input";
import {
  DeletedUserBadge, ErrorState, LoadMoreButton, ScrollToBottomButton,
} from "./support-shared";

const SCROLL_TOP_THRESHOLD = 5;
const NEAR_BOTTOM_THRESHOLD = 100;

// ============================================================
// Панель деталей чата поддержки (правая часть)
// ============================================================

interface SupportChatDetailPanelProps {
  chatId: number;
  /**
   * Callback после archive/unarchive — чтобы родитель (SupportChatsPageClient)
   * мог синхронизировать фильтр и activeChatId.
   *
   * Сценарии (см. handleArchiveStatusChange в page-client):
   *   - unarchive на фильтре "archived" → переключить на "active"
   *   - archive на фильтре "active"/"unread" → переключить на "all" (или сбросить)
   *   - совпадающий фильтр → ничего не делать
   */
  onArchiveStatusChange?: (chatId: number, isArchived: boolean) => void;
}

export function SupportChatDetailPanel({ chatId, onArchiveStatusChange }: SupportChatDetailPanelProps) {
  const { data: chat, isLoading, isError, refetch } = useSupportChatDetail(chatId, true);
  const markAsReadMutation = useMarkSupportAsRead();
  const archiveMutation = useArchiveSupportChat();
  const unarchiveMutation = useUnarchiveSupportChat();
  const sendMutation = useSendSupportMessage();
  const loadMoreMutation = useLoadMoreSupportMessages(chatId);
  const queryClient = useQueryClient();
  // Текущий админ — для subtle «Вы: {name}» в шапке чата.
  // Так видно «двух людей» в тикете: partner (юзер) и текущий отправитель (ты).
  const currentUser = useAdminUser();

  // Маппинг AdminUser → UserBadgeData.
  // AdminUser — лёгкий тип auth context (минимум полей).
  // UserBadge ожидает UserBadgeData (тяжёлый тип со статусом/premium/vip).
  // Для staff'а эти поля не relevant — подставляем дефолты:
  //   - is_online: true (staff в админке = активен)
  //   - status: 'active' (staff не банится)
  //   - deleted_at: null (staff не удаляется в этом контексте)
  //   - has_active_premium/vip: false (staff не платит за подписки)
  // adminBadgeData = null если currentUser нет (не залогинен — не должно быть в админке).
  const adminBadgeData: UserBadgeData | null = currentUser ? {
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
    avatar_url: currentUser.avatar_url,
    is_online: true,
    status: "active",
    deleted_at: null,
    has_active_premium: false,
    has_active_vip: false,
    is_verified: currentUser.is_verified,
  } : null;

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const isFirstLoadRef = useRef(true);
  const prevChatIdRef = useRef<number | null>(null);
  // Для новых сообщений — отслеживаем ID последнего
  const prevLastMessageIdRef = useRef<number | null>(null);
  // Для подгрузки старых — сохраняем позицию скролла ДО запроса
  const pendingScrollRestoreRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const wasAtBottomRef = useRef(true);

  const [isAtTop, setIsAtTop] = useState(false);
  const [unreadNewCount, setUnreadNewCount] = useState(0);

  const partner = chat?.partner ?? null;
  const isArchived = chat?.is_archived ?? false;
  // Глобальный staff_unread_count (не per-admin как раньше).
  const unreadCount = chat?.staff_unread_count ?? 0;
  // Кто последний раз прочитал — для UI «Прочитал {name} 5 мин назад».
  const lastReadBy = chat?.staff_last_read_by ?? null;
  const lastReadAt = chat?.staff_last_read_at ?? null;

  const chatIdentity = chat?.id;
  const lastMessageId = chat?.messages[chat.messages.length - 1]?.id ?? null;
  // firstMessageId — чтобы effect срабатывал при подгрузке старых
  const firstMessageId = chat?.messages[0]?.id ?? null;

  // --- scrollToBottom ---
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
    wasAtBottomRef.current = true;
    setIsAtTop(false);
    setUnreadNewCount(0);
  }, []);

  // --- Единый useLayoutEffect ---
  // deps: chatIdentity (смена чата), lastMessageId (новое сообщение), firstMessageId (подгрузка старых)
  useLayoutEffect(() => {
    if (!chatIdentity || !messagesContainerRef.current) return;

    const container = messagesContainerRef.current;
    const isChatChanged = prevChatIdRef.current !== chatIdentity;
    const isLoadMore = pendingScrollRestoreRef.current !== null;
    // Новое сообщение = ID последнего изменился, не подгрузка, не первая загрузка
    const isNewMessage = !isChatChanged && !isFirstLoadRef.current && !isLoadMore
      && lastMessageId !== null
      && lastMessageId !== prevLastMessageIdRef.current;

    // --- Смена чата: сброс ---
    if (isChatChanged) {
      prevChatIdRef.current = chatIdentity;
      isFirstLoadRef.current = true;
      pendingScrollRestoreRef.current = null;
      wasAtBottomRef.current = true;
      setIsAtTop(false);
      setUnreadNewCount(0);
    }

    // --- Подгрузка старых: сохраняем позицию скролла ---
    // До запроса мы запомнили scrollHeight и scrollTop. После подгрузки
    // новые (старые) сообщения добавились ВВЕРХ, scrollHeight вырос.
    // Восстанавливаем: scrollTop = oldScrollTop + diff.
    // Юзер остаётся на том же сообщении, прыжка нет.
    if (pendingScrollRestoreRef.current !== null) {
      const saved = pendingScrollRestoreRef.current;
      const newScrollHeight = container.scrollHeight;
      const diff = newScrollHeight - saved.scrollHeight;
      container.scrollTop = saved.scrollTop + diff;
      pendingScrollRestoreRef.current = null;
      // isAtTop пересчитается в handleScroll при следующем скролле,
      // но вручную обновим — после подгрузки юзер точно не в самом верху
      setIsAtTop(false);
      // wasAtBottom НЕ трогаем — остаётся как был
      prevLastMessageIdRef.current = lastMessageId;
      return;
    }

    // --- Первая загрузка: мгновенный скролл вниз + фокус ---
    if (isFirstLoadRef.current) {
      container.scrollTop = container.scrollHeight;
      isFirstLoadRef.current = false;
      setIsAtTop(container.scrollTop <= SCROLL_TOP_THRESHOLD);
      wasAtBottomRef.current = true;
      messageInputRef.current?.focus();
      prevLastMessageIdRef.current = lastMessageId;
      return;
    }

    // --- Новое сообщение (ВХОДЯЩИЕ через WebSocket) ---
    if (isNewMessage) {
      if (wasAtBottomRef.current) {
        // Юзер был внизу → автоскролл вниз
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
        setIsAtTop(false);
        wasAtBottomRef.current = true;
        setUnreadNewCount(0);
      } else {
        // Юзер выше → кружок "↓ N"
        setUnreadNewCount((prev) => prev + 1);
      }
    }

    prevLastMessageIdRef.current = lastMessageId;
  }, [chatIdentity, lastMessageId, firstMessageId]);

  // --- Auto-mark-as-read ---
  // Срабатывает в трёх случаях:
  //   1. При смене chatId (когда админ открывает тикет) — если staff_unread_count > 0.
  //   2. При новом входящем сообщении (через WebSocket) — если юзер в самом низу.
  //   3. Юзер сам доскроллил вниз — см. handleScroll.
  //
  // markAsRead SILENT (без toast.success) — см. useMarkSupportAsRead.
  // Бэкенд idempotent: если staff_unread_count === 0 && last_read_by === me → no-op.
  // Так что лишние вызовы безопасны (но всё равно guarded по staff_unread_count > 0,
  // чтобы не делать лишний HTTP запрос).
  useEffect(() => {
    if (!chat || chat.staff_unread_count === 0) return;
    // Только если это новое сообщение от юзера (админ сам отправил → уже обнулено на бэке).
    // Проверяем через wasAtBottomRef — был ли юзер внизу когда пришло сообщение.
    // Но при первой загрузке wasAtBottomRef=true (см. isFirstLoad в useLayoutEffect).
    //
    // Простая логика: если staff_unread_count > 0 — mark. Это покрывает оба случая:
    //   - Открыли чат с unread → mark
    //   - Пришло новое сообщение и юзер внизу → mark
    // Если юзер НЕ внизу (прокрутил вверх), это сработает только при открытии чата
    // (через смену chatId), а на новые сообщения не будет — см. условие в handleScroll.
    markAsReadMutation.mutate(chat.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.id, chat?.staff_unread_count]);

  // --- onScroll ---
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const scrollTop = container.scrollTop;
    const distanceFromBottom = container.scrollHeight - scrollTop - container.clientHeight;
    setIsAtTop(scrollTop <= SCROLL_TOP_THRESHOLD);
    const isNearBottom = distanceFromBottom < NEAR_BOTTOM_THRESHOLD;
    wasAtBottomRef.current = isNearBottom;
    if (isNearBottom && unreadNewCount > 0) {
      setUnreadNewCount(0);
    }
    // Auto-mark-as-read когда юзер доскроллил вниз И есть непрочитанные.
    // Это покрывает сценарий: юзер был выше, пришло сообщение, юзер доскроллил
    // вниз → тикет автоматически отмечается прочитанным.
    //
    // chat в deps (а не chat?.id) — React Compiler требует consistent
    // property access. Внутри функции обращаемся к chat.id (через mutate),
    // значит в deps должен быть весь chat объект.
    if (isNearBottom && unreadCount > 0 && !markAsReadMutation.isPending && chat) {
      markAsReadMutation.mutate(chat.id);
    }
  }, [unreadNewCount, unreadCount, markAsReadMutation, chat]);

  // --- Обработчик «Загрузить ещё» ---
  // Запоминаем scrollHeight и scrollTop ДО запроса. После подгрузки
  // useLayoutEffect восстановит позицию: scrollTop = oldScrollTop + diff.
  // Юзер останется на том же сообщении, прыжка не будет.
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

  // --- Обработчик отправки ---
  const handleSend = useCallback(async (body: string) => {
    try {
      await sendMutation.mutateAsync({ chatId, body });
      await queryClient.refetchQueries({ queryKey: ["admin", "support-chats", "detail", chatId] });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const container = messagesContainerRef.current;
          if (container) {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: "smooth",
            });
            setIsAtTop(false);
            wasAtBottomRef.current = true;
            setUnreadNewCount(0);
          }
        });
      });
    } catch (err) {
      console.error("[handleSend] ошибка:", err);
    }
  }, [chatId, sendMutation, queryClient]);

  // --- Обработчик клика по кружку "↓ N" ---
  const handleScrollToBottom = useCallback(() => {
    scrollToBottom("smooth");
  }, [scrollToBottom]);

  // --- Handlers для archive/unarchive с callback родителю ---
  // После success mutation вызываем onArchiveStatusChange — родитель
  // (SupportChatsPageClient) решит: переключить фильтр или сбросить activeChatId.
  // Сама mutation (useArchiveSupportChat/useUnarchiveSupportChat) только
  // инвалидирует query и показывает toast — не знает про UI state.
  const handleArchive = useCallback(async () => {
    try {
      await archiveMutation.mutateAsync(chatId);
      onArchiveStatusChange?.(chatId, true);
    } catch (err) {
      console.error("[handleArchive] error:", err);
    }
  }, [chatId, archiveMutation, onArchiveStatusChange]);

  const handleUnarchive = useCallback(async () => {
    try {
      await unarchiveMutation.mutateAsync(chatId);
      onArchiveStatusChange?.(chatId, false);
    } catch (err) {
      console.error("[handleUnarchive] error:", err);
    }
  }, [chatId, unarchiveMutation, onArchiveStatusChange]);

  // --- Загрузка / ошибка ---
  if (isLoading || !chat) {
    if (isError) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <ErrorState onRetry={refetch} message="Не удалось загрузить переписку." />
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
      <div className="shrink-0 flex items-center justify-between border-b border-border pb-3 mb-4 gap-4">
        {/* Левая часть: partner (юзер) — с кем общаемся. */}
        <div className="min-w-0">
          {partner ? (
            <a
              href={`/admin/users/${partner.id}`}
              className="block hover:opacity-80 transition-opacity cursor-pointer"
            >
              <UserBadge user={partner} size="md" />
            </a>
          ) : (
            <DeletedUserBadge size="md" />
          )}
        </div>

        {/* Правая часть: current admin + info badges + action buttons.
            Admin UserBadge первым — полноценный, с аватаркой (size="sm"
            для compact — partner md, admin sm, visual hierarchy:
            partner главный объект в чате, admin — текущий отправитель). */}
        <div className="flex gap-4 items-center shrink-0">
          {adminBadgeData && (
            <UserBadge user={adminBadgeData} size="sm" />
          )}

          <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
            Chat #{chat.id}
          </span>

          {/* Subtle «кто последний раз прочитал» — только если прочитан.
              Помогает видеть кто из команды работает с тикетом.
              title-атрибут — полный timestamp при наведении. */}
          {unreadCount === 0 && lastReadBy && (
            <span
              className="text-[10px] text-muted-foreground italic hidden md:inline"
              title={lastReadAt ? new Date(lastReadAt).toLocaleString("ru-RU") : undefined}
            >
              Прочитал {lastReadBy.name}
            </span>
          )}
          </div>

          {chat.is_locked && (
            <span className="text-xs text-destructive bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded flex items-center gap-1">
              <Unlock className="w-3 h-3" />
              Заблокирован
            </span>
          )}

          {unreadCount > 0 && (
            <Button
              variant="default"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => markAsReadMutation.mutate(chat.id)}
              disabled={markAsReadMutation.isPending}
            >
              {markAsReadMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              Отметить как прочитано
            </Button>
          )}

          {isArchived ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void handleUnarchive()}
              disabled={unarchiveMutation.isPending}
              title="Вернуть из архива"
            >
              {unarchiveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArchiveRestore className="w-4 h-4 text-green-500" />
              )}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void handleArchive()}
              disabled={archiveMutation.isPending}
              title="Архивировать"
            >
              {archiveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Archive className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Лента сообщений */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-2 little-scroll flex flex-col"
        >
          {hasMore && isAtTop && (
            <LoadMoreButton
              onLoadMore={handleLoadMore}
              isLoading={loadMoreMutation.isPending}
            />
          )}
          
          {chat.messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              Начните диалог.
            </div>
          ) : (
            chat.messages.map((msg) => (
              <SupportMessageBubble key={msg.id} message={msg} />
            ))
          )}
          <div className="shrink-0" />
        </div>

        <ScrollToBottomButton
          count={unreadNewCount}
          onClick={handleScrollToBottom}
        />
      </div>

      <MessageInput
        inputRef={messageInputRef}
        onSend={handleSend}
        isSending={sendMutation.isPending}
      />
    </>
  );
}

// ============================================================
// Empty state — когда чат не выбран
// ============================================================
export function SupportChatDetailEmpty() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
      <Inbox className="w-16 h-16 mb-4 opacity-20" />
      <h3 className="text-lg font-medium">Выберите тикет</h3>
      <p className="text-sm">Нажмите на диалог слева, чтобы открыть переписку.</p>
    </div>
  );
}