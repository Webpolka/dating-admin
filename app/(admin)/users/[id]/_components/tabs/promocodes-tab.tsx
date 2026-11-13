"use client";

// app/(admin)/users/[id]/_components/tabs/promocodes-tab.tsx
//
// Таб «Промокоды»: история применений промокодов пользователем.
//
// Per-user листинг: GET /admin/users/{userId}/promocodes?page=
// (UserListingsController::promocodes). applied_discount — снапшот
// скидки в рублях на момент применения (для фин. отчётов).

import { Tag, Ticket, Percent, Crown, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { TableEmptyRow, TableLoadingRow } from "@/components/admin/table-states";
import { TabError } from "@/components/admin/tab-states";
import { useTabUrl, parsePageParam } from "@/hooks/admin/use-tab-url";
import { useUserPromocodes } from "@/hooks/admin/use-users";
import { formatDate, formatDateTime } from "@/lib/format";

interface PromocodesTabProps {
  userId: number;
}

function DiscountLabel({
  type,
  value,
  durationDays,
}: {
  type: string;
  value: number;
  durationDays: number | null;
}) {
  switch (type) {
    case "percent":
      return <Badge variant="secondary"><Percent className="w-3 h-3 mr-1" />{value}%</Badge>;
    case "fixed":
      return <Badge variant="secondary">{value} ₽</Badge>;
    case "premium":
      return (
        <Badge variant="secondary" className="gap-1">
          <Crown className="w-3 h-3" />
          Premium {durationDays ? `${durationDays} дн.` : ""}
        </Badge>
      );
    case "vip":
      return (
        <Badge variant="secondary" className="gap-1">
          <Crown className="w-3 h-3" />
          VIP {durationDays ? `${durationDays} дн.` : ""}
        </Badge>
      );
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
}

export function PromocodesTab({ userId }: PromocodesTabProps) {
  const basePath = `/users/${userId}/promocodes`;
  const { searchParams, replace } = useTabUrl(basePath);

  const page = parsePageParam(searchParams);

  const { data, isLoading, isError, refetch } = useUserPromocodes(userId, { page });

  if (isError) return <TabError label="Не удалось загрузить промокоды" onRetry={refetch} />;

  const usages = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <Table className="w-full min-w-160">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-40">Код</TableHead>
              <TableHead className="w-36">Скидка</TableHead>
              <TableHead className="w-28">Выгода</TableHead>
              <TableHead>Транзакция</TableHead>
              <TableHead className="w-28">Действует до</TableHead>
              <TableHead className="w-36">Применён</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRow colSpan={6} />
            ) : usages.length === 0 ? (
              <TableEmptyRow colSpan={6} title="Пользователь не применял промокоды" />
            ) : (
              usages.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 font-mono text-sm">
                      <Ticket className="w-4 h-4 text-muted-foreground" />
                      {u.promo_code?.code ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {u.promo_code ? (
                      <DiscountLabel
                        type={u.promo_code.discount_type}
                        value={u.promo_code.discount_value}
                        durationDays={u.promo_code.duration_days}
                      />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-green-500">
                    {u.applied_discount > 0 ? `−${u.applied_discount} ₽` : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.transaction ? (
                      <>
                        #{u.transaction.id} · {u.transaction.amount} ₽ · {u.transaction.status}
                      </>
                    ) : (
                      "без транзакции"
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.promo_code?.expires_at ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(u.promo_code.expires_at)}
                      </span>
                    ) : (
                      "бессрочно"
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(u.created_at)}
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

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Tag className="w-3.5 h-3.5" />
        Скидка зафиксирована на момент применения; 1 промокод = 1 применение на пользователя.
      </p>
    </div>
  );
}
