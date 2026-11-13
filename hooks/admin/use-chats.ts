// hooks/admin/use-chats.ts
"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { extractErrorMessage } from "@/lib/api";
import { getEcho, type EchoInstance } from "@/lib/echo";

// ===== Типы =====
export type ChatUser = {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  is_online: boolean;
  status: "active" | "banned" | "shadowbanned" | "deactivated";
  deleted_at: string | null;
  has_active_premium: boolean;
  has_active_vip: boolean;
  is_verified: boolean;
};

export type ChatMessageType = "text" | "image" | "system" | "gift";

/**
 * Action системного сообщения — для цветовой дифференциации в UI.
 *
 * Бэк парсит body в ChatController::detectSystemAction() и отдаёт
 * это поле в response. Фронт использует system_action вместо fragile
 * text matching по body (если текст изменится на бэке — правим в одном месте).
 *
 * - 'lock'   → красный (чат заблокирован)
 * - 'unlock' → зелёный (чат разблокирован)
 * - null     → синий (любое другое system message)
 */
export type SystemAction = "lock" | "unlock" | null;

export type ChatMessage = {
  id: number;
  type: ChatMessageType;
  body: string | null;
  attachment_url: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string | null;
  sender: ChatUser | null;
  system_action: SystemAction;
  gift: { id: number; name: string; image_url: string | null } | null;
};

export type ChatListItem = {
  id: number;
  is_locked: boolean;
  last_message_at: string | null;
  participants: (ChatUser | null)[];
  last_message: {
    id: number;
    type: ChatMessageType;
    body: string | null;
    created_at: string | null;
  } | null;
};

export type ChatMessagesMeta = {
  has_more: boolean;
  oldest_id: number | null;
};

export type ChatDetail = {
  id: number;
  is_locked: boolean;
  last_message_at: string | null;
  participants: (ChatUser | null)[];
  messages: ChatMessage[];
  messages_meta: ChatMessagesMeta;
};

export type ChatsListResponse = {
  data: ChatListItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  counts: { total: number; locked: number; unlocked: number };
};

export type ChatsListParams = {
  q?: string;
  lock?: string;
  page?: number;
  per_page?: number;
};

// Тип события message.received с бэка (broadcast на admin.chats)
type ChatMessageEvent = {
  chat_id: number;
  sender_id: number;
  sender_name: string;
  message_type: string;
  message_body: string | null;
  created_at: string | null;
};

// ============================================================
// Хук: список чатов
// ============================================================
export function useChatsList(params: ChatsListParams) {
  const qc = useQueryClient();

  const query = useQuery<ChatsListResponse>({
    queryKey: ["admin", "chats", params],
    queryFn: async ({ queryKey }) => {
      const [, , p] = queryKey as [string, string, ChatsListParams];
      const search = new URLSearchParams();
      if (p.q) search.set("q", p.q);
      if (p.lock && p.lock !== "all") search.set("lock", p.lock);
      if (p.page) search.set("page", String(p.page));
      if (p.per_page) search.set("per_page", String(p.per_page));
      const { data } = await api.get<ChatsListResponse>(`/admin/chats?${search.toString()}`);
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  // WebSocket: слушаем admin.chats — любое новое сообщение в любом private-чате
  // → invalidate list query → refetch (обновится last_message, last_message_at,
  // сортировка). Используется moderator для realtime-обновления списка чатов.
  useEffect(() => {
    const echo: EchoInstance = getEcho();
    const channel = echo.private("admin.chats");

    channel.listen(".message.received", (_e: ChatMessageEvent) => {
      qc.invalidateQueries({ queryKey: ["admin", "chats"] });
    });

    return () => {
      channel.stopListening(".message.received");
    };
  }, [qc]);

  return query;
}

// ============================================================
// Хук: детали чата (первая загрузка — последние 50 сообщений)
// ============================================================
export function useChatDetail(chatId: number | null, enabled: boolean) {
  const qc = useQueryClient();

  const query = useQuery<ChatDetail>({
    queryKey: ["admin", "chats", "detail", chatId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ChatDetail }>(`/admin/chats/${chatId}`);
      return data.data;
    },
    enabled: enabled && !!chatId,
    staleTime: 30_000,
  });

  // WebSocket: слушаем chat.{chatId} — новое сообщение в открытом чате
  // → invalidate detail query → refetch (обновится messages + messages_meta).
  // Канал chat.{chatId} используется и юзерами (участниками чата), и админкой —
  // broadcast(new NewMessage($message)) стреляет на этот канал из MessageObserver.
  useEffect(() => {
    if (!chatId) return;

    const echo: EchoInstance = getEcho();
    const channel = echo.private(`chat.${chatId}`);

    channel.listen(".message.new", () => {
      qc.invalidateQueries({ queryKey: ["admin", "chats", "detail", chatId] });
    });

    return () => {
      channel.stopListening(".message.new");
    };
  }, [chatId, qc]);

  return query;
}

// ============================================================
// Хук: подгрузка более старых сообщений (пагинация по курсору)
// ============================================================
export function useLoadMoreMessages(chatId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const current = qc.getQueryData<ChatDetail>(["admin", "chats", "detail", id]);
      const before = current?.messages_meta?.oldest_id;

      const url = before
        ? `/admin/chats/${id}?before=${before}`
        : `/admin/chats/${id}`;

      const { data } = await api.get<{ data: ChatDetail }>(url);
      return data.data;
    },
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ["admin", "chats", "detail", id] });
      const prev = qc.getQueryData<ChatDetail>(["admin", "chats", "detail", id]);
      return { prev };
    },
    onSuccess: (fresh, id) => {
      const current = qc.getQueryData<ChatDetail>(["admin", "chats", "detail", id]);
      if (!current) {
        qc.setQueryData(["admin", "chats", "detail", id], fresh);
        return;
      }

      const existingIds = new Set(current.messages.map((m) => m.id));
      const newMessages = fresh.messages.filter((m) => !existingIds.has(m.id));

      const merged = [...newMessages, ...current.messages].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return aTime - bTime;
      });

      qc.setQueryData<ChatDetail>(["admin", "chats", "detail", id], {
        ...current,
        messages: merged,
        messages_meta: fresh.messages_meta,
      });
    },
    onError: (err: unknown, id, context) => {
      if (context?.prev) {
        qc.setQueryData(["admin", "chats", "detail", id], context.prev);
      }
      const message = extractErrorMessage(err, "Ошибка подгрузки сообщений");
      toast.error(message);
    },
  });
}

// ============================================================
// Хук: блокировка/разблокировка чата
// ============================================================
// ВАЖНО: фильтр ["admin", "chats"] матчит И список (["admin","chats",params]),
// И детали (["admin","chats","detail",chatId]). У деталей нет поля `data`
// (там `messages`), поэтому old.data.map() падает с "Cannot read property
// 'map' of undefined". Фикс — проверка Array.isArray(old.data) в callback.
export function useToggleChatLock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (chatId: number) => {
      const { data } = await api.post<{ message: string; is_locked: boolean }>(
        `/admin/chats/${chatId}/toggle-lock`
      );
      return data;
    },
    onMutate: async (chatId: number) => {
      await qc.cancelQueries({ queryKey: ["admin", "chats"] });

      // Снимок для отката — ВСЕ кэши по ["admin","chats"] (и список, и детали)
      const prevList = qc.getQueriesData<ChatsListResponse>({ queryKey: ["admin", "chats"] });
      const prevDetail = qc.getQueryData<ChatDetail>(["admin", "chats", "detail", chatId]);

      // Optimistic: обновляем список чатов.
      // ВАЖНО: проверка Array.isArray(old.data) — фильтр матчит и detail-кэш,
      // у которого old.data === undefined. Без проверки — краш.
      qc.setQueriesData<ChatsListResponse>(
        { queryKey: ["admin", "chats"] },
        (old) => {
          if (!old || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: old.data.map((c) =>
              c.id === chatId ? { ...c, is_locked: !c.is_locked } : c
            ),
          };
        }
      );

      // Optimistic: обновляем детали чата — только is_locked, messages НЕ трогаем
      if (prevDetail) {
        qc.setQueryData<ChatDetail>(["admin", "chats", "detail", chatId], {
          ...prevDetail,
          is_locked: !prevDetail.is_locked,
        });
      }

      return { prevList, prevDetail };
    },
    onError: (err: unknown, chatId, context) => {
      // Откат
      if (context?.prevList) {
        context.prevList.forEach(([key, data]) => {
          if (data !== undefined) {
            qc.setQueryData(key, data);
          }
        });
      }
      if (context?.prevDetail) {
        qc.setQueryData(["admin", "chats", "detail", chatId], context.prevDetail);
      }
      // Глобальный extractErrorMessage из lib/api.ts (раньше была локальная копия).
      const message = extractErrorMessage(err, "Ошибка смены статуса чата");
      toast.error(message);
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "chats"] });
    },
  });
}