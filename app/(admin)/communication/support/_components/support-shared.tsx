// app/(admin)/communication/support/_components/support-shared.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  AlertCircle, RefreshCw, ChevronUp, ChevronDown, Loader2,
} from "lucide-react";

// ============================================================
// Хелпер извлечения сообщения об ошибке (типобезопасный)
// ============================================================
// Используется в списке тикетов для отображения текста ошибки.
// Аналог extractErrorMessage из lib/api, но без зависимости от axios-типов.
export function extractErrorMessageSafe(err: unknown, fallback: string): string {
  if (typeof err !== "object" || err === null) return fallback;
  const e = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
  return e.response?.data?.message || e.response?.data?.error || e.message || fallback;
}

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
export function ErrorState({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <AlertCircle className="w-10 h-10 text-destructive/60" />
      <p className="text-sm text-muted-foreground">
        {message ?? "Не удалось загрузить данные."}
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
// Кнопка «Загрузить ещё» (вверху ленты)
// ============================================================
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
// Кнопка «↓ N» — новые непрочитанные внизу ленты
// ============================================================
// Показывается когда юзер выше низа И пришли новые сообщения.
// Клик → скролл вниз + сброс счётчика.
export function ScrollToBottomButton({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  if (count <= 0) return null;

  return (
    <button
      onClick={onClick}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20
                 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                 bg-primary text-primary-foreground text-xs font-medium
                 shadow-lg border border-primary
                 hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5
                 active:translate-y-0
                 transition-all duration-200
                 animate-in fade-in slide-in-from-bottom-2 duration-200"
      title="Перейти к новым сообщениям"
    >
      <ChevronDown className="w-3.5 h-3.5" />
      {count > 1 ? `${count} новых` : "1 новое"}
    </button>
  );
}

