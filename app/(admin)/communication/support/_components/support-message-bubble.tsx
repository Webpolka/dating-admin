// app/(admin)/communication/support/_components/support-message-bubble.tsx
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { SupportMessage } from "@/hooks/admin/use-support-chats";
import { formatDateTime } from "@/lib/format";
import { MessageContent } from "@/components/admin/message-content";

// ============================================================
// Пузырь сообщения поддержки
// ============================================================
// data-msg-id — для anchor-скролла при подгрузке старых сообщений
export function SupportMessageBubble({ message }: { message: SupportMessage }) {
  // --- Системное сообщение — по центру, амбер ---
  if (message.type === "system") {
    return (
      <div data-msg-id={message.id} className="flex justify-center my-2">
        <div className="text-xs text-center text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-1.5 max-w-[90%] shadow-sm">
          {message.body}
        </div>
      </div>
    );
  }

  // --- Обычное сообщение ---
  const isStaff = message.sender?.is_staff ?? false;

  return (
    <div
      data-msg-id={message.id}
      className={`flex items-end gap-2 ${isStaff ? "justify-end" : "justify-start"}`}
    >
      {!isStaff && message.sender && (
        <Avatar className="w-7 h-7 shrink-0">
          {message.sender.avatar_url && (
            <AvatarImage src={message.sender.avatar_url} alt={message.sender.name} />
          )}
          <AvatarFallback className="text-xs">
            {message.sender.name?.charAt(0).toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="max-w-[80%]">
        {isStaff && (
          <div className="mb-2 text-[10px] font-bold text-primary uppercase tracking-wide">
            {message.sender?.name ?? "Админ"}
          </div>
        )}
        <div
          className={`text-left break-words rounded-2xl px-4 py-2 ${
            isStaff ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
          }`}
        >
          <MessageContent body={message.body} isStaff={true} isSystem={false} />
        </div>
        <div className={`text-[10px] text-muted-foreground mt-1 ${isStaff ? "text-right" : "text-left"}`}>
          {message.created_at && formatDateTime(message.created_at)}
        </div>
      </div>
    </div>
  );
}