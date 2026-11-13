// app/(admin)/system/broadcasts/_components/broadcast-row-actions.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Send, Copy, Trash2 } from "lucide-react";
import type { BroadcastItem } from "@/hooks/admin/use-broadcasts";

interface Props {
  broadcast: BroadcastItem;
  isSending: boolean; // F8: per-row pending для sendNow
  onEdit: () => void;
  onSendNow: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/**
 * Dropdown-меню действий в строке таблицы рассылок.
 * Вынесено в отдельный компонент — раньше было inline в таблице.
 *
 * F8: isSending теперь per-row — кнопка "Отправить сейчас" блокируется
 * только для конкретной рассылки, а не глобально.
 */
export function BroadcastRowActions({
  broadcast,
  isSending,
  onEdit,
  onSendNow,
  onDuplicate,
  onDelete,
}: Props) {
  const canEdit = ["draft", "scheduled"].includes(broadcast.status);
  const canDelete = ["draft", "scheduled", "sent", "failed"].includes(broadcast.status);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" disabled={isSending} />}>
        <MoreHorizontal className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-42">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Действия</DropdownMenuLabel>
          {canEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="w-4 h-4" /> Редактировать
            </DropdownMenuItem>
          )}
          {canEdit && (
            <DropdownMenuItem onClick={onSendNow} disabled={isSending}>
              <Send className="w-4 h-4" /> {isSending ? "Отправка..." : "Отправить сейчас"}
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="w-4 h-4" /> Дублировать
            </DropdownMenuItem>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="w-4 h-4" /> Удалить
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}