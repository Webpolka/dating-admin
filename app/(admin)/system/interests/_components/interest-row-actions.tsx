// app/(admin)/system/interests/_components/interest-row-actions.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import type { InterestList } from "@/hooks/admin/use-interests";

interface Props {
  interest: InterestList;
  onEdit: () => void;
  onBoost: () => void;
  onUnboost: () => void;
  onDelete: () => void;
}

/**
 * Dropdown-меню действий в строке таблицы интересов.
 * Упрощённое (vs PostRowActions) — нет статусов/архива/дублирования,
 * только: редактировать, буст, удалить.
 */
export function InterestRowActions({
  interest,
  onEdit,
  onBoost,
  onUnboost,
  onDelete,
}: Props) {
  const isBoosted = interest.search_boost > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <MoreHorizontal className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-42">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Действия</DropdownMenuLabel>
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="w-4 h-4" /> Редактировать
          </DropdownMenuItem>

          {isBoosted ? (
            <DropdownMenuItem onClick={onUnboost}>
              <TrendingDown className="w-4 h-4" /> Снять буст
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onBoost}>
              <TrendingUp className="w-4 h-4" /> Поднять в выдаче
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 className="w-4 h-4" /> Удалить навсегда
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
