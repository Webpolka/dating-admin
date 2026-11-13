"use client";

// app/(admin)/users/[id]/_components/tabs/cards-tab.tsx
//
// Таб «Карты»: платёжные карты пользователя.
//
// Per-user листинг: GET /admin/users/{userId}/cards?page=
// (UserListingsController::cards, read-only — токены карт бэкенд
// не отдаёт, только маскированные данные). Массовые операции с картами
// не предусмострены — управляет ими сам юзер через платёжный шлюз.

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
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <Table className="w-full min-w-140">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-36">Бренд</TableHead>
              <TableHead className="w-32">Номер</TableHead>
              <TableHead className="w-28">Срок</TableHead>
              <TableHead className="w-36">Шлюз</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-36">Добавлена</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRow colSpan={6} />
            ) : cards.length === 0 ? (
              <TableEmptyRow colSpan={6} title="У пользователя нет платёжных карт" />
            ) : (
              cards.map((card) => (
                <TableRow key={card.id}>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 text-sm">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      {CARD_BRAND_LABELS[card.card_type ?? ""] ?? card.card_type ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">•••• {card.last4 ?? "????"}</TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {card.expiry_month && card.expiry_year
                      ? `${card.expiry_month}/${card.expiry_year}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{card.gateway}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {card.is_default && (
                        <Badge variant="default" className="gap-1">
                          <Star className="w-3 h-3" />
                          основная
                        </Badge>
                      )}
                      {card.trashed ? (
                        <Badge variant="outline">удалена</Badge>
                      ) : card.is_expired ? (
                        <Badge variant="warning">истекла</Badge>
                      ) : card.is_active ? (
                        <Badge variant="success">активна</Badge>
                      ) : (
                        <Badge variant="secondary">неактивна</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(card.created_at)}
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
