"use client";

// app/(admin)/users/[id]/_components/tabs/gifts-tab.tsx
//
// Таб «Подарки»: единый список подарков юзера с фильтром по направлению.
//
// Per-user листинг: GET /admin/users/{userId}/gifts?filter=all&page=2
// (UserListingsController::gifts, single-list с filter=all|sent|received,
// формат айтема = глобальная история /finance/gifts + поле direction).
// Действия (hide/restore) — в глобальном разделе /finance/gifts?q=<id>.
//
// Зеркало blade-эталона: кнопки фильтра (Все/Отправленные/Полученные) сверху,
// single-list снизу. В каждом ряду — #id (ссылка на историю), снапшот подарка
// (картинка + название + цена), направление (стрелка + counterpart), статус
// (приватный/публичный или прочитан/не прочитан), дата.

import { ArrowDownLeft, ArrowUpRight, Gift, EyeOff, ImageOff } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { TabError, TabLoading } from "@/components/admin/tab-states";
import { UserBadge } from "@/components/admin/user-badge";
import { useTabUrl, parsePageParam, parseEnumParam } from "@/hooks/admin/use-tab-url";
import { useUserGifts } from "@/hooks/admin/use-users";
import { formatRelativeTime } from "@/lib/format";
import type { UserBadgeData } from "@/lib/types";
import type { UserGiftsParams, UserGiftTabItem } from "@/lib/api/users";

interface GiftsTabProps {
  userId: number;
}

const FILTER_VALUES = ["all", "sent", "received"] as const;

const EMPTY_TEXT: Record<string, string> = {
  all:      "У пользователя нет подарков.",
  sent:     "Пользователь еще никому не дарил подарков.",
  received: "Пользователь не получал подарков.",
};

export function GiftsTab({ userId }: GiftsTabProps) {
  const basePath = `/users/${userId}/gifts`;
  const { searchParams, replace } = useTabUrl(basePath);

  const filter = parseEnumParam(searchParams, "filter", FILTER_VALUES, "all");
  const page = parsePageParam(searchParams);

  const { data, isLoading, isError, refetch } = useUserGifts(userId, { filter, page });

  if (isLoading || !data) return <TabLoading label="Загрузка подарков..." />;
  if (isError) return <TabError label="Не удалось загрузить подарки" onRetry={refetch} />;

  const gifts = data.data;
  const counts = data.counts;

  const setFilter = (next: UserGiftsParams["filter"] ) => {
    replace((p) => {
      if (next === "all") p.delete("filter");
      else p.set("filter", next);
      p.delete("page");
    });
  };

  const isFilterActive = (value: UserGiftsParams["filter"]) => filter === value;

  return (
    <div className="space-y-4">
      {/* === Кнопки фильтра === */}
      <div className="flex flex-wrap gap-1.5">
        <Button
          variant={isFilterActive("all") ? "default" : "secondary"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          Все подарки <span className="opacity-70">({counts.all})</span>
        </Button>
        <Button
          variant={isFilterActive("sent") ? "default" : "secondary"}
          size="sm"
          onClick={() => setFilter("sent")}
        >
          <ArrowUpRight className="w-3.5 h-3.5" /> Отправленные <span className="opacity-70">({counts.sent})</span>
        </Button>
        <Button
          variant={isFilterActive("received") ? "default" : "secondary"}
          size="sm"
          onClick={() => setFilter("received")}
        >
          <ArrowDownLeft className="w-3.5 h-3.5" /> Полученные <span className="opacity-70">({counts.received})</span>
        </Button>
      </div>

      {/* === Список === */}
      {gifts.length === 0 ? (
        <div className="p-4 bg-muted/20 rounded-lg border border-border text-center text-xs text-muted-foreground">
          {EMPTY_TEXT[filter]}
        </div>
      ) : (
        <div className="space-y-2">
          {gifts.map((g) => (
            <GiftRow key={g.id} item={g} />
          ))}
        </div>
      )}

      <MiniPagination
        currentPage={data.current_page}
        lastPage={data.last_page}
        from={data.from}
        to={data.to}
        total={data.total}
        onChangePage={(next) => replace((p) => (next <= 1 ? p.delete("page") : p.set("page", String(next))))}
      />

      <div className="text-xs text-muted-foreground">
        <Gift className="w-3.5 h-3.5 inline mr-1" />
        <Link
          href="/finance/gifts"
          className="hover:text-foreground underline underline-offset-2"
        >
          Управлять подарками в разделе «Финансы → Подарки»
        </Link>
      </div>
    </div>
  );
}

// ============================================
// СТРОКА ПОДАРКА
// ============================================

function GiftRow({ item }: { item: UserGiftTabItem }) {
  // В sent показываем получателя, в received — отправителя.
  const counterpart = item.direction === "sent" ? item.receiver : item.sender;

  return (
    <div
      className={`flex items-center gap-4 p-3 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors ${
        item.is_hidden ? "opacity-50" : ""
      }`}
    >
      {/* #id → история подарков */}
      <Link
        href={`/finance/gifts?q=${item.id}`}
        className="text-xs font-mono text-blue-500 hover:underline font-medium shrink-0"
        title="Найти в истории дарений"
      >
        #{item.id}
      </Link>

      {/* Снапшот подарка */}
      {item.snapshot_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.snapshot_image_url}
          alt={item.snapshot_name}
          className="w-14 h-14 rounded-md object-cover bg-muted shrink-0"
        />
      ) : (
        <div className="w-14 h-14 flex items-center justify-center rounded-md bg-muted border border-dashed border-border shrink-0">
          <ImageOff className="w-4 h-4 text-muted-foreground/50" />
        </div>
      )}

      {/* Название + цена + сообщение */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">
            {item.snapshot_name || "Подарок удален"}
          </span>
          <span className="text-sm font-medium text-yellow-600 dark:text-yellow-500">
            {item.snapshot_price} 💎
          </span>
        </div>
        {item.message && (
          <p className="text-[10px] text-muted-foreground italic truncate" title={item.message}>
            <span className="text-white/40">Сообщение:</span> «{item.message}»
          </p>
        )}
      </div>

      {/* Направление + counterpart */}
      <div className="flex items-center gap-2 min-w-[180px] shrink-0">
        {item.direction === "sent" ? (
          <div className="flex items-center gap-1 text-blue-500 text-xs font-medium shrink-0">
            <ArrowUpRight className="w-4 h-4" /> Кому:
          </div>
        ) : (
          <div className="flex items-center gap-1 text-destructive text-xs font-medium shrink-0">
            <ArrowDownLeft className="w-4 h-4" /> От кого:
          </div>
        )}
        {counterpart ? (
          <UserBadge user={counterpart as UserBadgeData} />
        ) : (
          <span className="text-xs text-muted-foreground italic">Система/Удален</span>
        )}
      </div>

      {/* Статус */}
      <div className="flex flex-col gap-1 shrink-0">
        {item.direction === "sent" ? (
          item.is_private ? (
            <Badge variant="secondary">Приватный</Badge>
          ) : (
            <Badge variant="success">Публичный</Badge>
          )
        ) : item.is_read ? (
          <Badge variant="secondary">Прочитан</Badge>
        ) : (
          <Badge variant="warning">Не прочитан</Badge>
        )}
        {item.is_hidden && (
          <Badge variant="destructive" className="gap-1">
            <EyeOff className="w-3 h-3" /> Скрыт
          </Badge>
        )}
      </div>

      {/* Дата */}
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
        {item.created_at ? formatRelativeTime(item.created_at) : "—"}
      </span>
    </div>
  );
}
