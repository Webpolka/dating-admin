"use client";

// components/admin/list-pagination.tsx
//
// Большая пагинация списков: «Показано X – Y из N» + Prev / номера / Next.
//
// Заменяет связку renderPageNumbers + обёртку из PaginationContent,
// которая копипастилась в 30 списочных компонентов (каждый *_shared.tsx
// нёс свою копию алгоритма с эллипсисами). Алгоритм номеров тот же:
// окно из PAGINATION_MAX_PAGES (5) страниц вокруг текущей, крайние
// страницы всегда видимы, между ними «…».
//
// Для узких мест (колонки, табы юзера) остаётся MiniPagination.
//
// Скрывается целиком, если страница одна — счётчик тоже (паттерн,
// принятый во всех списках: пустая пагинация не занимает место).

import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { PAGINATION_MAX_PAGES } from "@/lib/constants";

interface ListPaginationProps {
  currentPage: number;
  lastPage: number;
  /** Порядковые номера записей на странице (из Laravel-пагинатора). */
  from?: number | null;
  to?: number | null;
  total?: number;
  onChangePage: (page: number) => void;
  /** Блокировка на время запроса (isFetching) — Prev/Next гаснут. */
  disabled?: boolean;
}

/** Окно видимых номеров: [startPage..endPage] вокруг текущей. */
function getPageWindow(currentPage: number, lastPage: number): [number, number] {
  const maxPages = PAGINATION_MAX_PAGES;
  let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
  const endPage = Math.min(lastPage, startPage + maxPages - 1);
  if (endPage - startPage + 1 < maxPages) {
    startPage = Math.max(1, endPage - maxPages + 1);
  }
  return [startPage, endPage];
}

export function ListPagination({
  currentPage,
  lastPage,
  from = null,
  to = null,
  total = 0,
  onChangePage,
  disabled = false,
}: ListPaginationProps) {
  if (lastPage <= 1) return null;

  // Счётчик показываем, только если есть данные для него (например,
  // chat-list пагинирует без from/to — там остаётся чистый переключатель).
  const hasCounter = from !== null || to !== null;

  const [startPage, endPage] = getPageWindow(currentPage, lastPage);

  const pageNumbers: React.ReactNode[] = [];

  if (startPage > 1) {
    pageNumbers.push(
      <PaginationItem key="first">
        <PaginationLink
          href="#"
          onClick={(e) => { e.preventDefault(); onChangePage(1); }}
          isActive={currentPage === 1}
        >
          1
        </PaginationLink>
      </PaginationItem>,
    );
    if (startPage > 2) pageNumbers.push(<PaginationEllipsis key="ellipsis-start" />);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(
      <PaginationItem key={i}>
        <PaginationLink
          href="#"
          onClick={(e) => { e.preventDefault(); onChangePage(i); }}
          isActive={i === currentPage}
        >
          {i}
        </PaginationLink>
      </PaginationItem>,
    );
  }

  if (endPage < lastPage) {
    if (endPage < lastPage - 1) pageNumbers.push(<PaginationEllipsis key="ellipsis-end" />);
    pageNumbers.push(
      <PaginationItem key="last">
        <PaginationLink
          href="#"
          onClick={(e) => { e.preventDefault(); onChangePage(lastPage); }}
          isActive={lastPage === currentPage}
        >
          {lastPage}
        </PaginationLink>
      </PaginationItem>,
    );
  }

  return (
    <div className={`flex items-center flex-wrap gap-2 ${hasCounter ? "justify-between" : "justify-end"}`}>
      {hasCounter && (
        <div className="text-xs text-muted-foreground tabular-nums">
          Показано {from ?? 0} - {to ?? 0} из {total}
        </div>
      )}
      <Pagination className="justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => { e.preventDefault(); onChangePage(Math.max(1, currentPage - 1)); }}
              aria-disabled={currentPage === 1 || disabled}
              className={currentPage === 1 || disabled ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
          {pageNumbers}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => { e.preventDefault(); onChangePage(Math.min(lastPage, currentPage + 1)); }}
              aria-disabled={currentPage >= lastPage || disabled}
              className={currentPage >= lastPage || disabled ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
