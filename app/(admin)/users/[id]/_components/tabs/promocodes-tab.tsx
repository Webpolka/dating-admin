"use client";

// app/(admin)/users/[id]/_components/tabs/promocodes-tab.tsx
//
// Таб «Промокоды»: история применений промокодов пользователем.
//
// Per-user листинг: GET /admin/users/{userId}/promocodes?page=
// (UserListingsController::promocodes). applied_discount — снапшот скидки
// в рублях на момент применения (для фин. отчётов). Управление промокодами —
// в глобальном разделе (там же редактирование/деактивация самих кодов).
//
// Зеркало blade-эталона: таблица с колонками ID/Промокод/Скидка(тип+значение)
// /Транзакция(ссылка на /finance/transactions?q={id})/Дата. discount_type —
// percent/fixed/premium/vip, для premium/vip показываем duration_days.

import { Crown, Percent, Ticket } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { TableEmptyRow, TableLoadingRow } from "@/components/admin/table-states";
import { TabError } from "@/components/admin/tab-states";
import { useTabUrl, parsePageParam } from "@/hooks/admin/use-tab-url";
import { useUserPromocodes } from "@/hooks/admin/use-users";
import { formatDateTime } from "@/lib/format";

interface PromocodesTabProps {
  userId: number;
}

export function PromocodesTab({ userId }: PromocodesTabProps) {
  const basePath = `/users/${userId}/promocodes`;
  const { searchParams, replace } = useTabUrl(basePath);

  const page = parsePageParam(searchParams);

  const { data, isLoading, isError, refetch } = useUserPromocodes(userId, { page });

  if (isError) return <TabError label="Не удалось загрузить промокоды" onRetry={refetch} />;

  const usages = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <Table className="w-full min-w-160">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Промокод</TableHead>
              <TableHead className="w-44">Скидка / Бонус</TableHead>
              <TableHead className="w-48">Транзакция</TableHead>
              <TableHead className="w-32">Дата применения</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRow colSpan={5} />
            ) : usages.length === 0 ? (
              <TableEmptyRow colSpan={5} title="Пользователь не использовал промокоды" />
            ) : (
              usages.map((u) => (
                <TableRow key={u.id}>
                  {/* ID — моно */}
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    #{u.id}
                  </TableCell>

                  {/* Промокод — моно в плашке, или «Код удалён» */}
                  <TableCell>
                    {u.promo_code ? (
                      <span className="text-sm font-mono font-medium bg-muted px-2 py-0.5 rounded">
                        {u.promo_code.code}
                      </span>
                    ) : (
                      <span className="text-sm font-mono text-muted-foreground italic">
                        Код удалён
                      </span>
                    )}
                  </TableCell>

                  {/* Скидка: тип-бейдж + значение + applied_discount */}
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {u.promo_code ? (
                        <DiscountBadge
                          type={u.promo_code.discount_type}
                          value={u.promo_code.discount_value}
                          durationDays={u.promo_code.duration_days}
                        />
                      ) : (
                        <Badge variant="secondary">Архив</Badge>
                      )}
                      {u.applied_discount > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          Списано: {u.applied_discount} ₽
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Транзакция — ссылка на /finance/transactions */}
                  <TableCell className="text-xs">
                    {u.transaction ? (
                      <Link
                        href={`/finance/transactions?q=${u.transaction.id}`}
                        className="text-blue-500 hover:underline font-mono"
                        title="Найти в журнале транзакций"
                      >
                        #{u.transaction.id} ({u.transaction.amount} ₽)
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Дата применения */}
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {u.created_at ? formatDateTime(u.created_at) : "—"}
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
        <Ticket className="w-3.5 h-3.5" />
        Скидка зафиксирована на момент применения; 1 промокод = 1 применение на пользователя.
      </p>
    </div>
  );
}

// ============================================
// БЕЙДЖ СКИДКИ (по discount_type)
// ============================================

function DiscountBadge({
  type,
  value,
  durationDays,
}: {
  type: "percent" | "fixed" | "premium" | "vip";
  value: number;
  durationDays: number | null;
}) {
  switch (type) {
    case "percent":
      return (
        <Badge variant="secondary" className="gap-1 w-fit">
          <Percent className="w-3 h-3" />−{value}%
        </Badge>
      );
    case "fixed":
      return <Badge variant="secondary" className="w-fit">−{value} ₽</Badge>;
    case "premium":
      return (
        <Badge variant="warning" className="gap-1 w-fit">
          <Crown className="w-3 h-3" />
          +Premium{durationDays ? ` (${durationDays} дн.)` : ""}
        </Badge>
      );
    case "vip":
      return (
        <Badge variant="warning" className="gap-1 w-fit">
          <Crown className="w-3 h-3" />
          +VIP{durationDays ? ` (${durationDays} дн.)` : ""}
        </Badge>
      );
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
}
