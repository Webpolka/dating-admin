// app/(admin)/communication/chats/_components/chat-shared.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  AlertCircle, RefreshCw, ChevronUp, Loader2,
  Image as ImageIcon, Gift as GiftIcon,
} from "lucide-react";
import type { ChatListItem } from "@/hooks/admin/use-chats";

// ============================================================
// Fallback для удалённого пользователя
// ============================================================
export function DeletedUserBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const avatarSize = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  return (
    <div className="flex items-center gap-2">
      <div className={`${avatarSize} rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0`}>
        <AlertCircle className={iconSize} />
      </div>
      <span className={`${textSize} text-muted-foreground italic`}>Удалён</span>
    </div>
  );
}

// ============================================================
// Error state с retry-кнопкой
// ============================================================
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <AlertCircle className="w-10 h-10 text-destructive/60" />
      <p className="text-sm text-muted-foreground">
        Не удалось загрузить данные.
        <br />
        Проверьте соединение с сервером.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="w-4 h-4" />
        Повторить
      </Button>
    </div>
  );
}

// ============================================================
// Кнопка «Загрузить ещё» — pill, со стрелкой вверх, hover-эффекты
// ============================================================
// Показывается ТОЛЬКО когда юзер проскроллил в самый верх ленты
// (условие isAtTop проверяется в родителе). Здесь — только визуал.
export function LoadMoreButton({
  onLoadMore,
  isLoading,
}: {
  onLoadMore: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex justify-center py-3 animate-in fade-in slide-in-from-top-2 duration-200">
      <button
        onClick={onLoadMore}
        disabled={isLoading}
        className={`
          inline-flex items-center gap-2 px-4 py-1.5 rounded-full
          text-xs font-medium
          bg-background/80 backdrop-blur-sm
          border border-border shadow-sm
          transition-all duration-200
          hover:bg-primary hover:text-primary-foreground hover:border-primary
          hover:shadow-md hover:-translate-y-0.5
          active:translate-y-0
          disabled:opacity-60 disabled:cursor-not-allowed
          disabled:hover:bg-background/80 disabled:hover:text-current
          disabled:hover:border-border disabled:hover:translate-y-0 disabled:hover:shadow-sm
        `}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5" />
        )}
        {isLoading ? "Загрузка..." : "Загрузить ещё"}
      </button>
    </div>
  );
}

// ============================================================
// Превью последнего сообщения для списка чатов
// ============================================================
export function renderLastMessagePreview(lastMsg: ChatListItem["last_message"]): React.ReactNode {
  if (!lastMsg) {
    return <span className="italic">Нет сообщений</span>;
  }

  switch (lastMsg.type) {
    case "system":
      return <span className="text-blue-500 font-medium">Системное</span>;
    case "image": {
      const body = lastMsg.body?.trim();
      return (
        <span className="inline-flex items-center gap-1">
          <ImageIcon className="w-3 h-3" />
          Фото{body ? ` — ${body.slice(0, 24)}` : ""}
        </span>
      );
    }
    case "gift":
      return (
        <span className="inline-flex items-center gap-1">
          <GiftIcon className="w-3 h-3" />
          Подарок
        </span>
      );
    case "text":
    default: {
      const body = lastMsg.body?.trim();
      return body ? body.slice(0, 30) : <span className="italic">Пусто</span>;
    }
  }
}

