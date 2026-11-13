// app/(admin)/communication/chats/_components/message-bubble.tsx
"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import type { ChatMessage, SystemAction } from "@/hooks/admin/use-chats";
import { formatDateTime } from "@/lib/format";

// ============================================================
// Пузырь сообщения
// ============================================================
// data-msg-id — для anchor-скролла при подгрузке старых сообщений
// (chat-detail-panel находит элемент по этому атрибуту и скроллит к нему)
export function MessageBubble({
  message,
  u1Id,
}: {
  message: ChatMessage;
  u1Id: number | null;
}) {
  // --- Системное сообщение ---
  if (message.type === "system") {
    const body = message.body ?? "";

    // Цветовая дифференциация по system_action (поле от бэка, не text matching).
    // Раньше было body.includes("заблокирован") — fragile, зависело от текста.
    // Теперь бэк парсит body в detectSystemAction() и отдаёт system_action field.
    const colorClasses = systemActionColorClasses(message.system_action);

    return (
      <div data-msg-id={message.id} className="flex justify-center">
        <div className={`whitespace-pre-line wrap-break-words text-xs font-medium px-4 py-2 rounded-lg text-center max-w-md border ${colorClasses}`}>
          {body}
        </div>
      </div>
    );
  }

  // --- Обычное сообщение ---
  const isUser1 = message.sender?.id === u1Id;

  return (
    <div data-msg-id={message.id} className={`flex items-end gap-2 ${isUser1 ? "justify-start" : "justify-end"}`}>
      <div className="max-w-[70%]">
        <div
          className={`text-left whitespace-pre-line wrap-break-words rounded-2xl px-4 py-2 text-sm ${
            isUser1 ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
          }`}
        >
          {/* Image-сообщение */}
          {message.type === "image" && message.attachment_url ? (
            <div className="mb-1">
              <ChatImage src={message.attachment_url} alt="Изображение" />
            </div>
          ) : null}

          {/* Текст */}
          {message.body && <p>{message.body}</p>}

          {/* Подарок */}
          {message.type === "gift" && message.gift && (
            <div className="mt-2 flex items-center gap-2 bg-background/20 p-2 rounded-lg">
              {message.gift.image_url && (
                <ChatImage
                  src={message.gift.image_url}
                  alt={message.gift.name}
                  className="w-8 h-8 object-contain"
                />
              )}
              <span className="text-xs font-medium">Подарок: {message.gift.name}</span>
            </div>
          )}
        </div>

        <div className={`text-[10px] text-muted-foreground mt-1 ${isUser1 ? "text-left" : "text-right"}`}>
          {message.created_at && formatDateTime(message.created_at)}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Хелпер: цветовые классы для system_action
// ============================================================
function systemActionColorClasses(action: SystemAction): string {
  switch (action) {
    case "lock":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    case "unlock":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    default:
      // null — любое другое system message (например, warning от fraud alert)
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  }
}

// ============================================================
// Image с onError fallback
// ============================================================
// Если URL broken / 404 / сеть упала — показываем placeholder с иконкой
// вместо broken image icon браузера. Состояние локальное (per-image),
// при ошибке ставим hasError=true и рендерим fallback.
function ChatImage({
  src,
  alt,
  className = "rounded-lg max-w-full max-h-64 object-cover",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-muted/50 text-muted-foreground ${className}`}
        title="Изображение недоступно"
      >
        <ImageOff className="w-6 h-6" />
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element -- user-uploaded content, URL динамический */
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}