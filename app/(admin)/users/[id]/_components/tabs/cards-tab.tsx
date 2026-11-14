"use client";

// app/(admin)/users/[id]/_components/tabs/cards.tsx
//
// Таб «Карты»: платёжные карты пользователя.
//
// Per-user листинг: GET /admin/users/{userId}/cards?page=
// (UserListingsController::cards, withTrashed — удалённые карты остаются в
// истории для фин. отчётов. Read-only: токены карт бэк не отдаёт, только
// маскированные данные last4/brand/срок). Управляет ими сам юзер через
// платёжный шлюз — массовых операций в админке нет.
//
// Зеркало blade-эталона: таблица с колонками ID/Карта/Шлюз/Срок/Статус/Привязана.
// trashed-карты — opacity-50 + бейдж «Удалена». is_expired — бейдж «Истекла»
// рядом со сроком. is_default — бейдж «По умолчанию».

import { CreditCard, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { TableEmptyRow, TableLoadingRow } from "@/components/admin/table-states";
import { TabError } from "@/components/admin/tab-states";
import { useTabUrl, parsePageParam } from "@/hooks/admin/use-tab-url";
import { useUserCards } from "@/hooks/admin/use-users";
import { formatDateTime } from "@/lib/format";

interface CardsTabProps {
  userId: number;
}

const CARD_BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  mir: "МИР",
};

export function CardsTab({ userId }: CardsTabProps) {
  const basePath = `/users/${userId}/cards`;
  const { searchParams, replace } = useTabUrl(basePath);

  const page = parsePageParam(searchParams);

  const { data, isLoading, isError, refetch } = useUserCards(userId, { page });

  if (isError) return <TabError label="Не удалось загрузить карты" onRetry={refetch} />;

  const cards = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <Table className="w-full min-w-140">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Карта</TableHead>
              <TableHead className="w-32">Шлюз</TableHead>
              <TableHead className="w-32">Срок</TableHead>
              <TableHead className="w-40">Статус</TableHead>
              <TableHead className="w-32">Привязана</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRow colSpan={6} />
            ) : cards.length === 0 ? (
              <TableEmptyRow colSpan={6} title="У пользователя нет привязанных банковских карт" />
            ) : (
              cards.map((card) => (
                <TableRow
                  key={card.id}
                  className={card.trashed ? "opacity-50" : undefined}
                >
                  {/* ID — моно, не кликабельный (глобального раздела карт нет) */}
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    #{card.id}
                  </TableCell>

                  {/* Карта: бренд + маскированный номер */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium uppercase">
                        {CARD_BRAND_LABELS[card.card_type ?? ""] ?? card.card_type ?? "—"}
                      </span>
                      <span className="text-sm font-mono">**** {card.last4 ?? "????"}</span>
                    </div>
                  </TableCell>

                  {/* Шлюз */}
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {card.gateway ?? "—"}
                    </Badge>
                  </TableCell>

                  {/* Срок + бейдж истечения */}
                  <TableCell className="text-xs text-muted-foreground">
                    {card.expiry_month && card.expiry_year ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="tabular-nums">
                          {card.expiry_month} / {card.expiry_year}
                        </span>
                        {card.is_expired && (
                          <Badge variant="destructive">Истекла</Badge>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  {/* Статус: удалена | (по умолчанию + активна/неактивна) */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {card.trashed ? (
                        <Badge variant="destructive">Удалена</Badge>
                      ) : (
                        <>
                          {card.is_default && (
                            <Badge variant="default" className="gap-1">
                              <Star className="w-3 h-3" />
                              По умолчанию
                            </Badge>
                          )}
                          {card.is_active ? (
                            <Badge variant="success">Активна</Badge>
                          ) : (
                            <Badge variant="secondary">Неактивна</Badge>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>

                  {/* Привязана — дата создания */}
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {card.created_at ? formatDateTime(card.created_at) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && (
        <MiniPagination
          currentPage={data.current_page}
          lastPage={data.last_page}
          from={data.from}
          to={data.to}
          total={data.total}
          onChangePage={(next) => replace((p) => (next <= 1 ? p.delete("page") : p.set("page", String(next))))}
        />
      )}
    </div>
  );
}
