// components/admin/tab-states.tsx
"use client";

import { Loader2, ServerCrash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Стандартные стейты для контента табов на странице юзера.
 *
 * Проблема, которую решают: раньше каждый таб писал загрузку как
 * `if (isLoading || !data) return <div>Загрузка...</div>`. При ошибке
 * запроса isLoading = false, data = undefined — и условие продолжало
 * держать таб в состоянии "Загрузка..." вечно, без шанса на retry.
 *
 * Теперь:
 *   isLoading → <TabLoading />
 *   isError   → <TabError onRetry={refetch} />
 *
 * Оба стейта выравнены по высоте контента таба (min-h-[200px]),
 * чтобы переключение табов не «прыгало».
 */

interface TabLoadingProps {
  /** Текст под спиннером — по умолчанию "Загрузка...". */
  label?: string;
  /** Дополнительные классы для обёртки. */
  className?: string;
}

export function TabLoading({ label = "Загрузка...", className }: TabLoadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 min-h-50 text-muted-foreground",
        className,
      )}
    >
      <Loader2 className="w-6 h-6 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

interface TabErrorProps {
  /** Callback на повтор — обычно refetch из useQuery. */
  onRetry?: () => void;
  /** Текст ошибки — по умолчанию общий. */
  label?: string;
  /** Дополнительные классы для обёртки. */
  className?: string;
}

export function TabError({ onRetry, label = "Не удалось загрузить данные", className }: TabErrorProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 min-h-50 text-muted-foreground",
        className,
      )}
    >
      <ServerCrash className="w-8 h-8 text-destructive/60" />
      <span className="text-sm">{label}</span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  );
}
