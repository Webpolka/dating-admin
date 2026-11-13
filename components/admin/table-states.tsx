"use client";

// components/admin/table-states.tsx
//
// Строки-состояния для <TableBody>: загрузка и пустой результат.
//
// Заменяет копипасту «TableRow > TableCell colSpan=N с Loader2/Inbox»,
// повторявшуюся в каждой таблице. Высоты и отступы — те же, что были
// приняты в списках (py-16 спиннер, h-64 пусто), чтобы миграция
// не меняла внешний вид.

import { Inbox, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

interface TableLoadingRowProps {
  colSpan: number;
}

/** Строка-спиннер на время первой загрузки списка. */
export function TableLoadingRow({ colSpan }: TableLoadingRowProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-16">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </TableCell>
    </TableRow>
  );
}

interface TableEmptyRowProps {
  colSpan: number;
  /** Заголовок пустого состояния, напр. «Нет жалоб». */
  title: string;
  /** Пояснение под заголовком. */
  hint?: React.ReactNode;
  /** Показать кнопку «Сбросить фильтры» (только если фильтры активны). */
  onResetFilters?: () => void;
}

/** Строка «пусто»: иконка + заголовок + опциональный сброс фильтров. */
export function TableEmptyRow({ colSpan, title, hint, onResetFilters }: TableEmptyRowProps) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={colSpan}
        className="h-64 text-center text-muted-foreground animate-in fade-in duration-300"
      >
        <div className="flex flex-col items-center gap-3">
          <Inbox className="w-16 h-16 opacity-25" />
          <p className="text-sm font-medium">{title}</p>
          {hint && <p className="text-sm">{hint}</p>}
          {onResetFilters && (
            <Button variant="outline" size="sm" onClick={onResetFilters} className="mt-2">
              Сбросить фильтры
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
