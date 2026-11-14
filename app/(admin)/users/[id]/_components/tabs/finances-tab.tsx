"use client";

// app/(admin)/users/[id]/_components/tabs/finances-tab.tsx
//
// Таб «Финансы»: финансовый дашборд пользователя.
//
// Per-user листинг: GET /admin/users/{userId}/finances?trans_page=&sub_page=
// (UserListingsController::finances, composite: balance + statuses +
//  transactions + subscriptions). Действия (sync/refund транзакций, manage
//  подписок) — в глобальных разделах /finance/transactions и
//  /finance/subscription-plans.
//
// Зеркало blade-эталона:
//   - Верхняя панель: карточка баланса (credits + superlikes) + карточка
//     активных статусов (Premium/VIP с датами истечения).
//   - Нижняя панель: двухколоночный grid — слева история транзакций (по 5),
//     справа история подписок (по 5). Каждая колонка со своей пагинацией.

import { Wallet, Gem, Star, Crown, Receipt, History, ExternalLink } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { TabError, TabLoading } from "@/components/admin/tab-states";
import { useTabUrl, parsePageParam } from "@/hooks/admin/use-tab-url";
import { useUserFinances } from "@/hooks/admin/use-users";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import type {
  UserFinancesResponse,
  UserTransactionItem,
  UserSubscriptionItem,
} from "@/lib/api/users";

interface FinancesTabProps {
  userId: number;
}

export function FinancesTab({ userId }: FinancesTabProps) {
  const basePath = `/users/${userId}/finances`;
  const { searchParams, replace } = useTabUrl(basePath);

  const transPage = parsePageParam(searchParams, "trans_page");
  const subPage = parsePageParam(searchParams, "sub_page");

  const { data, isLoading, isError, refetch } = useUserFinances(userId, {
    trans_page: transPage,
    sub_page: subPage,
  });

  if (isLoading || !data) return <TabLoading label="Загрузка финансов..." />;
  if (isError) return <TabError label="Не удалось загрузить финансы" onRetry={refetch} />;

  const { balance, statuses, transactions, subscriptions } = data;

  return (
    <div className="space-y-6">
      {/* === ВЕРХНЯЯ ПАНЕЛЬ: Баланс + Статусы === */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BalanceCard balance={balance} />
        <StatusesCard statuses={statuses} />
      </div>

      {/* === НИЖНЯЯ ПАНЕЛЬ: Транзакции + Подписки === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Левая колонка: Транзакции */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Receipt className="w-4 h-4" /> Транзакции ({transactions.total})
          </h3>

          {transactions.data.length === 0 ? (
            <div className="p-4 bg-muted/20 rounded-lg border border-border text-center text-xs text-muted-foreground">
              Транзакций не найдено.
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.data.map((t) => (
                <TransactionRow key={t.id} t={t} />
              ))}
            </div>
          )}

          <MiniPagination
            currentPage={transactions.current_page}
            lastPage={transactions.last_page}
            from={transactions.from}
            to={transactions.to}
            total={transactions.total}
            onChangePage={(next) =>
              replace((p) => (next <= 1 ? p.delete("trans_page") : p.set("trans_page", String(next))))
            }
          />
        </div>

        {/* Правая колонка: Подписки */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <History className="w-4 h-4" /> Подписки ({subscriptions.total})
          </h3>

          {subscriptions.data.length === 0 ? (
            <div className="p-4 bg-muted/20 rounded-lg border border-border text-center text-xs text-muted-foreground">
              Подписок не найдено.
            </div>
          ) : (
            <div className="space-y-2">
              {subscriptions.data.map((s) => (
                <SubscriptionRow key={s.id} s={s} />
              ))}
            </div>
          )}

          <MiniPagination
            currentPage={subscriptions.current_page}
            lastPage={subscriptions.last_page}
            from={subscriptions.from}
            to={subscriptions.to}
            total={subscriptions.total}
            onChangePage={(next) =>
              replace((p) => (next <= 1 ? p.delete("sub_page") : p.set("sub_page", String(next))))
            }
          />
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        <ExternalLink className="w-3.5 h-3.5 inline mr-1" />
        <Link
          href={`/finance/transactions?q=${userId}`}
          className="hover:text-foreground underline underline-offset-2"
        >
          Открыть в разделе «Финансы → Транзакции» (синхронизация, возвраты)
        </Link>
      </div>
    </div>
  );
}

// ============================================
// КАРТОЧКА БАЛАНСА
// ============================================

function BalanceCard({
  balance,
}: {
  balance: UserFinancesResponse["balance"];
}) {
  return (
    <div className="p-4 bg-muted/20 rounded-lg border border-border h-full flex flex-col justify-center">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Wallet className="w-4 h-4" /> Текущий баланс
      </h3>

      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <Gem className="w-10 h-10 text-blue-500" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold">{balance.credits}</span>
            <span className="text-xs text-muted-foreground">Кредитов</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-10 h-10 text-yellow-500 fill-current" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold">{balance.superlikes_remaining}</span>
            <span className="text-xs text-muted-foreground">Суперлайков</span>
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================
// КАРТОЧКА СТАТУСОВ (Premium / VIP)
// ============================================

function StatusesCard({
  statuses,
}: {
  statuses: UserFinancesResponse["statuses"];
}) {
  // Парсим даты истечения для логики «истёк / активен / нет».
  const premiumExpired =
    statuses.premium_expires_at !== null &&
    new Date(statuses.premium_expires_at).getTime() < Date.now();
  const vipExpired =
    statuses.vip_expires_at !== null &&
    new Date(statuses.vip_expires_at).getTime() < Date.now();

  return (
    <div className="p-4 bg-muted/20 rounded-lg border border-border h-full flex flex-col justify-center">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Crown className="w-4 h-4 text-yellow-500" /> Активные статусы
      </h3>

      <div className="flex flex-col gap-3">
        {/* Premium */}
        <div className="flex items-center gap-3">
          {statuses.has_active_premium ? (
            <>
              <Badge variant="success">Premium</Badge>
              {statuses.premium_expires_at && (
                <span className="text-xs text-muted-foreground">
                  до {formatDateTime(statuses.premium_expires_at)}
                </span>
              )}
            </>
          ) : premiumExpired ? (
            <>
              <Badge variant="destructive">Premium истёк</Badge>
              <span className="text-xs text-muted-foreground">
                {statuses.premium_expires_at
                  ? new Date(statuses.premium_expires_at).toLocaleDateString("ru-RU")
                  : ""}
              </span>
            </>
          ) : (
            <Badge variant="secondary">Premium нет</Badge>
          )}
        </div>

        {/* VIP */}
        <div className="flex items-center gap-3">
          {statuses.has_active_vip ? (
            <>
              <Badge variant="success">VIP (Буст)</Badge>
              {statuses.vip_expires_at && (
                <span className="text-xs text-muted-foreground">
                  до {formatDateTime(statuses.vip_expires_at)}
                </span>
              )}
            </>
          ) : vipExpired ? (
            <>
              <Badge variant="destructive">VIP истёк</Badge>
              <span className="text-xs text-muted-foreground">
                {statuses.vip_expires_at
                  ? new Date(statuses.vip_expires_at).toLocaleDateString("ru-RU")
                  : ""}
              </span>
            </>
          ) : (
            <Badge variant="secondary">VIP нет</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// СТРОКА ТРАНЗАКЦИИ
// ============================================

function TransactionRow({ t }: { t: UserTransactionItem }) {
  // Цвет суммы по статусу (зеркало blade-эталона).
  let amountColor = "text-foreground";
  switch (t.status) {
    case "success":  amountColor = "text-green-500 font-semibold"; break;
    case "refunded": amountColor = "text-red-500 font-semibold"; break;
    case "failed":   amountColor = "text-muted-foreground/50"; break;
    case "pending":  amountColor = "text-yellow-500"; break;
  }

  // Дата события: pending → created_at, иначе updated_at (как в blade).
  const eventDate = t.status === "pending" ? t.created_at : t.updated_at;

  // Название тарифа на момент покупки — лежит в meta.plan_name (subscription-транзакции).
  // meta: Record<string, unknown> | null — приводим к ожидаемой форме.
  const planName =
    t.meta && typeof t.meta === "object" && "plan_name" in t.meta
      ? String((t.meta as { plan_name?: unknown }).plan_name ?? "")
      : "";

  return (
    <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors">
      {/* #id → журнал транзакций */}
      <Link
        href={`/finance/transactions?q=${t.id}`}
        className="text-xs font-mono text-blue-500 hover:underline shrink-0"
        title="Открыть в журнале транзакций"
      >
        #{t.id}
      </Link>

      <div className="flex-1 min-w-0 space-y-1">
        {/* Тип + название тарифа/кол-во кредитов */}
        <div className="flex flex-col">
          {t.type === "subscription" ? (
            <>
              <Badge variant={t.type_badge.variant as "default"} className={t.type_badge.className}>
                {t.type_badge.label}
              </Badge>
              <span className="text-xs text-muted-foreground mt-0.5">
                {/* meta.plan_name — название тарифа на момент покупки */}
                {planName ?? "Тариф удалён"}
              </span>
            </>
          ) : t.type === "credits" ? (
            <>
              <span className="text-sm font-medium">Покупка кредитов</span>
              <span className="text-xs text-muted-foreground">{t.credits_amount ?? 0} шт</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">{t.type}</span>
          )}
        </div>
      </div>

      {/* Сумма */}
      <span className={`text-sm ${amountColor} shrink-0`}>{t.formatted_amount}</span>

      {/* Статус + дата */}
      <div className="flex flex-col gap-1 shrink-0">
        <Badge variant={t.status_badge.variant as "default"}>{t.status_badge.label}</Badge>
        <span className="text-[10px] text-muted-foreground">
          {eventDate ? formatDateTime(eventDate) : "—"}
        </span>
      </div>
    </div>
  );
}

// ============================================
// СТРОКА ПОДПИСКИ
// ============================================

function SubscriptionRow({ s }: { s: UserSubscriptionItem }) {
  // Дата события: active → created_at (дата покупки), иначе updated_at (когда отменили).
  const eventDate = s.status === "active" ? s.created_at : s.updated_at;

  return (
    <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors">
      {/* #plan_id → управление тарифом (как в blade: по plan_id) */}
      <Link
        href={`/finance/subscription-plans?q=${s.plan_id}`}
        className="text-xs font-mono text-blue-500 hover:underline shrink-0"
        title="Открыть в управлении тарифами"
      >
        #{s.plan_id}
      </Link>

      {/* Тип + название тарифа */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-col">
          <Badge variant={s.tier === "vip" ? "success" : "secondary"}>
            {s.tier === "vip" ? "VIP" : "Premium"}
          </Badge>
          <span className="text-sm font-medium mt-1">{s.plan?.name ?? "Тариф удалён"}</span>
        </div>
      </div>

      {/* Срок действия */}
      <div className="flex flex-col text-xs text-muted-foreground shrink-0">
        <span>С: {s.starts_at ? formatDateTime(s.starts_at) : "—"}</span>
        <span>По: {s.ends_at ? formatDateTime(s.ends_at) : "—"}</span>
      </div>

      {/* Чек (transaction_id) */}
      <div className="text-xs text-muted-foreground font-mono shrink-0">
        {s.transaction_id ? (
          <Link
            href={`/finance/transactions?q=${s.transaction_id}`}
            className="text-blue-500 hover:underline"
            title="Найти чек об оплате"
          >
            #{s.transaction_id}
          </Link>
        ) : (
          <span>—</span>
        )}
      </div>

      {/* Статус + дата */}
      <div className="flex flex-col gap-1 shrink-0">
        <Badge variant={s.status_badge.variant as "default"}>{s.status_badge.label}</Badge>
        <span className="text-[10px] text-muted-foreground">
          {eventDate ? formatRelativeTime(eventDate) : "—"}
        </span>
      </div>
    </div>
  );
}
