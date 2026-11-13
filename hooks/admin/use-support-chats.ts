// hooks/admin/use-support-chats.ts
"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { extractErrorMessage } from "@/lib/api";
import { getEcho, type EchoInstance } from "@/lib/echo";
import type { UserBadgeData } from "@/lib/types";

// ===== Типы =====
export type SupportUser = UserBadgeData & {
  is_staff: boolean;
};

export type SupportMessageType = "text" | "image" | "system" | "gift";

export type SupportMessage = {
  id: number;
  type: SupportMessageType;
  body: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string | null;
  sender: SupportUser | null;
};

/**
 * Кто из staff последний раз прочитал тикет (для UI «Прочитал {name} 5 мин назад»).
 *
 * null — свежесозданный чат, который ещё никто не читал.
 */
export type StaffLastReadBy = {
  id: number;
  name: string;
} | null;

export type SupportChatListItem = {
  id: number;
  is_locked: boolean;
  last_message_at: string | null;
  /**
   * ГЛОБАЛЬНЫЙ счётчик непрочитанных сообщений от юзера (для всех staff).
   * Если один staff прочитал → обнуляется для всех.
   * Раньше было per-admin поле `unread_count` — теперь глобальное.
   */
  staff_unread_count: number;
  /**
   * Когда любой staff последний раз прочитал тикет (ISO8601).
   * null — никто ещё не читал.
   */
  staff_last_read_at: string | null;
  /**
   * Кто из staff последний раз прочитал (для UI «Прочитал {name}»).
   * null — никто ещё не читал.
   */
  staff_last_read_by: StaffLastReadBy;
  /**
   * ГЛОБАЛЬНЫЙ архив тикета.
   * Если один staff архивировал → исчезает из активных у всех.
   */
  is_archived: boolean;
  partner: SupportUser | null;
  last_message: {
    id: number;
    type: SupportMessageType;
    body: string | null;
    created_at: string | null;
  } | null;
};

export type SupportMessagesMeta = {
  has_more: boolean;
  oldest_id: number | null;
};

export type SupportChatDetail = {
  id: number;
  is_locked: boolean;
  is_archived: boolean;
  last_message_at: string | null;
  partner: SupportUser | null;
  /**
   * ГЛОБАЛЬНЫЙ счётчик непрочитанных от юзера (для всех staff).
   */
  staff_unread_count: number;
  /**
   * Когда любой staff последний раз прочитал тикет (ISO8601).
   */
  staff_last_read_at: string | null;
  /**
   * Кто из staff последний раз прочитал — для шапки чата «Прочитал {name}».
   */
  staff_last_read_by: StaffLastReadBy;
  messages: SupportMessage[];
  messages_meta: SupportMessagesMeta;
};

export type SupportChatsListResponse = {
  data: SupportChatListItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  counts: { all: number; active: number; unread: number; archived: number };
  filter: string;
};

export type SupportChatsListParams = {
  q?: string;
  filter?: string;
  page?: number;
  per_page?: number;
};

export type SupportTemplate = {
  id: number;
  title: string;
  body: string;
  category: string;
};

// Тип события support.message.received с бэка
type SupportMessageEvent = {
  chat_id: number;
  sender_id: number;
  sender_name: string;
  sender_is_staff: boolean;
  message_type: string;
  message_body: string | null;
  created_at: string | null;
};

// Тип события chat.read с бэка (другой staff прочитал тикет)
type SupportChatReadEvent = {
  chat_id: number;
  read_by_id: number;
  read_by_name: string;
  read_at: string;
};

// Тип события chat.archived с бэка (другой staff архивировал)
type SupportChatArchivedEvent = {
  chat_id: number;
  archived_by_id: number;
  archived_by_name: string;
  archived_at: string;
};

// Тип события chat.unarchived с бэка (другой staff вернул из архива)
type SupportChatUnarchivedEvent = {
  chat_id: number;
  unarchived_by_id: number;
  unarchived_by_name: string;
  unarchived_at: string;
  reason: string | null;
};

// ===== Хуки =====

export function useSupportChatsList(params: SupportChatsListParams) {
  const qc = useQueryClient();

  const query = useQuery<SupportChatsListResponse>({
    queryKey: ["admin", "support-chats", params],
    queryFn: async ({ queryKey }) => {
      const [, , p] = queryKey as [string, string, SupportChatsListParams];
      const search = new URLSearchParams();
      if (p.q) search.set("q", p.q);
      if (p.filter) search.set("filter", p.filter);
      if (p.page) search.set("page", String(p.page));
      if (p.per_page) search.set("per_page", String(p.per_page));
      const { data } = await api.get<SupportChatsListResponse>(`/admin/support-chats?${search.toString()}`);
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 10_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const echo: EchoInstance = getEcho();
    const channel = echo.private("admin.support");

    // Любое из этих событий → invalidate list query.
    // refetch пойдёт асинхронно, React Query подхватит с placeholderData
    // (prev) => prev — без мерцания.
    channel.listen(".message.received", (_e: SupportMessageEvent) => {
      qc.invalidateQueries({ queryKey: ["admin", "support-chats"] });
    });

    // Другой staff прочитал тикет → в его списке обнулится
    // staff_unread_count и обновится staff_last_read_by.
    channel.listen(".chat.read", (_e: SupportChatReadEvent) => {
      qc.invalidateQueries({ queryKey: ["admin", "support-chats"] });
    });

    // Другой staff архивировал → тикет исчезнет из active/unread списков,
    // появится в archived (если там смотрит).
    channel.listen(".chat.archived", (_e: SupportChatArchivedEvent) => {
      qc.invalidateQueries({ queryKey: ["admin", "support-chats"] });
    });

    // Другой staff вернул из архива (вручную или auto-unarchive при ответе).
    channel.listen(".chat.unarchived", (_e: SupportChatUnarchivedEvent) => {
      qc.invalidateQueries({ queryKey: ["admin", "support-chats"] });
    });

    return () => {
      channel.stopListening(".message.received");
      channel.stopListening(".chat.read");
      channel.stopListening(".chat.archived");
      channel.stopListening(".chat.unarchived");
    };
  }, [qc]);

  return query;
}

/**
 * Отдельный query ТОЛЬКО для counts (Все / Непрочитанные / Активные / Архив).
 *
 * ЗАЧЕМ отдельный от useSupportChatsList:
 *   - useSupportChatsList имеет queryKey включающий params (filter, page, q).
 *     При смене фильтра queryKey меняется → React Query начинает fresh fetch →
 *     на момент fetch data = undefined → counts = 0 → скачкообразный UI
 *     (счётчики показывают 0, потом правильное число).
 *   - useSupportChatsCounts имеет STABLE queryKey (без params) → не пересоздаётся
 *     при смене фильтра → counts стабильные, не скачут.
 *
 * counts — ГЛОБАЛЬНЫЕ (не зависят от filter). Бэк возвращает все 4 числа
 * (all/active/unread/archived) независимо от выбранного фильтра. Поэтому
 * можно дёргать тот же endpoint с per_page=1 — нужен только counts из response.
 *
 * WebSocket listener: тот же admin.support channel → invalidate counts query
 * на любое событие (new message / read / archived / unarchived).
 *
 * staleTime: 10_000 (10 сек) — counts не меняются часто.
 * refetchInterval: 60_000 (60 сек) — fallback auto-refresh.
 */
export function useSupportChatsCounts() {
  const qc = useQueryClient();

  const query = useQuery<{
    all: number;
    active: number;
    unread: number;
    archived: number;
  }>({
    queryKey: ["admin", "support-chats", "counts"],
    queryFn: async () => {
      // per_page=1 — минимальный payload, нужен только counts.
      // filter=all — чтобы не фильтровать (counts всё равно глобальные).
      const { data } = await api.get<SupportChatsListResponse>(
        `/admin/support-chats?filter=all&per_page=1`
      );
      return data.counts;
    },
    staleTime: 10_000,
    refetchInterval: 60_000,
  });

  // WebSocket: invalidate counts при любом событии на admin.support.
  // Все 4 типа событий могут поменять counts:
  //   - .message.received → staff_unread_count++ → unread count меняется
  //   - .chat.read → staff_unread_count=0 → unread count меняется
  //   - .chat.archived → is_archived=true → active/archived counts меняются
  //   - .chat.unarchived → is_archived=false → active/archived counts меняются
  useEffect(() => {
    const echo: EchoInstance = getEcho();
    const channel = echo.private("admin.support");

    const handler = () => {
      qc.invalidateQueries({ queryKey: ["admin", "support-chats", "counts"] });
    };

    channel.listen(".message.received", handler);
    channel.listen(".chat.read", handler);
    channel.listen(".chat.archived", handler);
    channel.listen(".chat.unarchived", handler);

    return () => {
      channel.stopListening(".message.received");
      channel.stopListening(".chat.read");
      channel.stopListening(".chat.archived");
      channel.stopListening(".chat.unarchived");
    };
  }, [qc]);

  return query;
}

export function useSupportChatDetail(chatId: number | null, enabled: boolean) {
  const qc = useQueryClient();

  const query = useQuery<SupportChatDetail>({
    queryKey: ["admin", "support-chats", "detail", chatId],
    queryFn: async () => {
      const { data } = await api.get<{ data: SupportChatDetail }>(`/admin/support-chats/${chatId}`);
      return data.data;
    },
    enabled: enabled && !!chatId,
    staleTime: 5_000,
    refetchInterval: 60_000,
    // БЕЗ placeholderData — refetch возвращает новый объект, React видит изменение
  });

  useEffect(() => {
    if (!chatId) return;

    const echo: EchoInstance = getEcho();
    const channel = echo.private(`chat.${chatId}`);

    channel.listen(".message.new", () => {
      qc.invalidateQueries({ queryKey: ["admin", "support-chats", "detail", chatId] });
    });

    return () => {
      channel.stopListening(".message.new");
    };
  }, [chatId, qc]);

  return query;
}

export function useLoadMoreSupportMessages(chatId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const current = qc.getQueryData<SupportChatDetail>(["admin", "support-chats", "detail", id]);
      const before = current?.messages_meta?.oldest_id;

      const url = before
        ? `/admin/support-chats/${id}?before=${before}`
        : `/admin/support-chats/${id}`;

      const { data } = await api.get<{ data: SupportChatDetail }>(url);
      return data.data;
    },
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ["admin", "support-chats", "detail", id] });
      const prev = qc.getQueryData<SupportChatDetail>(["admin", "support-chats", "detail", id]);
      return { prev };
    },
    onSuccess: (fresh, id) => {
      const current = qc.getQueryData<SupportChatDetail>(["admin", "support-chats", "detail", id]);
      if (!current) {
        qc.setQueryData(["admin", "support-chats", "detail", id], fresh);
        return;
      }

      const existingIds = new Set(current.messages.map((m) => m.id));
      const newMessages = fresh.messages.filter((m) => !existingIds.has(m.id));

      const merged = [...newMessages, ...current.messages].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return aTime - bTime;
      });

      qc.setQueryData<SupportChatDetail>(["admin", "support-chats", "detail", id], {
        ...current,
        messages: merged,
        messages_meta: fresh.messages_meta,
      });
    },
    onError: (err: unknown, id, context) => {
      if (context?.prev) {
        qc.setQueryData(["admin", "support-chats", "detail", id], context.prev);
      }
      const message = extractErrorMessage(err, "Ошибка подгрузки сообщений");
      toast.error(message);
    },
  });
}

export function useSupportTemplates() {
  return useQuery<SupportTemplate[]>({
    queryKey: ["admin", "support-templates"],
    queryFn: async () => {
      const { data } = await api.get<{ data: SupportTemplate[] }>(`/admin/support-chats/templates`);
      return data.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useMarkSupportAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (chatId: number) => {
      const { data } = await api.post<{ message: string }>(`/admin/support-chats/${chatId}/mark-as-read`);
      return data;
    },
    onSuccess: () => {
      // SILENT success — без toast.success.
      // mark-as-read вызывается автоматически при открытии чата и при
      // новых сообщениях (см. SupportChatDetailPanel). Если показывать
      // toast каждый раз — будет спам. Просто инвалидируем list query,
      // чтобы список обновился (unread badge исчез).
      qc.invalidateQueries({ queryKey: ["admin", "support-chats"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка отметки о прочтении")),
  });
}

export function useArchiveSupportChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (chatId: number) => {
      const { data } = await api.post<{ message: string }>(`/admin/support-chats/${chatId}/archive`);
      return data;
    },
    onSuccess: (data) => {
      toast.info(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "support-chats"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка архивации")),
  });
}

export function useUnarchiveSupportChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (chatId: number) => {
      const { data } = await api.post<{ message: string }>(`/admin/support-chats/${chatId}/unarchive`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["admin", "support-chats"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка возврата из архива")),
  });
}

export function useSendSupportMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ chatId, body }: { chatId: number; body: string }) => {
      const { data } = await api.post<{ message: string }>(`/admin/support-chats/${chatId}/send`, { body });
      return data;
    },
    onSuccess: (_data, { chatId }) => {
      // Инвалидируем и список (последнее сообщение, unread), и детали.
      // refetch пойдёт асинхронно — но в компоненте мы ждём его через
      // await refetchQueries, поэтому скролл сработает когда данные готовы.
      qc.invalidateQueries({ queryKey: ["admin", "support-chats"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Ошибка отправки сообщения")),
  });
}

export function useStartSupportChatWithUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: number) => {
      const { data } = await api.post<{ message: string; chat_id: number }>(`/admin/support-chats/start/${userId}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "support-chats"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Не удалось создать чат")),
  });
}