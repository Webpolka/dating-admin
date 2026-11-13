// app/(admin)/system/broadcasts/_components/broadcast-status-badge.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { BroadcastItem } from "@/hooks/admin/use-broadcasts";

/**
 * Бейдж статуса рассылки с детализацией (sent_count / failed_count).
 * Вынесено в отдельный компонент — раньше было inline-функцией в таблице.
 */
export function BroadcastStatusBadge({ broadcast }: { broadcast: BroadcastItem }) {
  const { status, sent_count, failed_count } = broadcast;

  if (status === "draft") {
    return <Badge variant="warning">Черновик</Badge>;
  }

  if (status === "scheduled") {
    return <Badge variant="warning">Запланировано</Badge>;
  }

  if (status === "sending") {
    return (
      <div className="flex items-center gap-1.5 text-blue-500 animate-pulse">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs font-medium">Отправка...</span>
      </div>
    );
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col gap-0.5">
        <Badge variant="success">Отправлено</Badge>
        <span className="text-[10px] text-muted-foreground">{sent_count} доставлено</span>
        {failed_count > 0 && <span className="text-[10px] text-destructive">{failed_count} ошибок</span>}
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col gap-0.5">
        <Badge variant="destructive">Ошибка</Badge>
        <span className="text-[10px] text-destructive">Упало: {failed_count}</span>
      </div>
    );
  }

  return null;
}