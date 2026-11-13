// components/admin/mini-pagination.tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Компактная пагинация для колонок и вложенных списков внутри табов
 * страницы юзера (жалобы, блокировки, а в будущем — фото, подарки...).
 *
 * Отличается от большой пагинации из components/ui/pagination:
 *   - предназначена для узких колонок (кнопки назад/вперёд + "N / M");
 *   - управляется колбэком, а не URL — страница уже хранится в URL
 *     самим табом (searchParams), компонент только сообщает о смене.
 *
 * Скрывается целиком, если страница всего одна — не занимает место.
 */
interface MiniPaginationProps {
  currentPage: number;
  lastPage: number;
  /** Порядковые номера записей на странице (из Laravel-пагинатора). */
  from: number | null;
  to: number | null;
  total: number;
  onChangePage: (page: number) => void;
}

export function MiniPagination({
  currentPage,
  lastPage,
  from,
  to,
  total,
  onChangePage,
}: MiniPaginationProps) {
  // Одна страница — листать нечего, счётчик тоже не нужен.
  if (lastPage <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-2 pt-2">
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        {from != null && to != null ? `${from}–${to} из ${total}` : `Всего: ${total}`}
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChangePage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-7 px-2"
          aria-label="Предыдущая страница"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>

        <span className="text-xs text-muted-foreground px-2 tabular-nums">
          {currentPage} / {lastPage}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onChangePage(currentPage + 1)}
          disabled={currentPage >= lastPage}
          className="h-7 px-2"
          aria-label="Следующая страница"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
