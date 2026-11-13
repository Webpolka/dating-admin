"use client";

// app/(admin)/users/[id]/_components/tabs/gifts-tab.tsx
//
// Таб «Подарки»: отправленные и полученные пользователем подарки.
//
// Per-user листинг: GET /admin/users/{userId}/gifts?sent_page=&received_page=
// (UserListingsController::gifts, две независимые пагинации, формат айтемов
// 1:1 с глобальной историей /finance/gifts → history).
// Действия (скрыть/вернуть подарок) — в глобальном разделе.

import { Gift, Send, Inbox, EyeOff } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { TabError, TabLoading } from "@/components/admin/tab-states";
import { UserBadge } from "@/components/admin/user-badge";
import { useTabUrl, parsePageParam } from "@/hooks/admin/use-tab-url";
import { useUserGifts } from "@/hooks/admin/use-users";
import { formatDateTime } from "@/lib/format";
import type { UserBadgeData } from "@/lib/types";
import type { UserGiftItem } from "@/hooks/admin/use-gifts";

interface GiftsTabProps {
  userId: number;
}

function GiftRow({ item, perspective }: { item: UserGiftItem; perspective: "sent" | "received" }) {
  // В sent-секции показываем получателя, в received — отправителя.
  const counterpart = perspective === "sent" ? item.receiver : item.sender;

  return (
    <div className="flex items-center gap-4 p-3 border border-border rounded-lg bg-card">
      {/* Медиа-домен бэкенда — next/image тут не применим. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.snapshot_image_url}
        alt={item.snapshot_name}
        className="w-12 h-12 rounded-md object-contain bg-muted shrink-0"
      />

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{item.snapshot_name}</span>
          <span className="text-xs text-muted-foreground">{item.snapshot_price} ₽</span>
          {item.is_private && <Badge variant="secondary">приватный</Badge>}
          {item.is_hidden && (
            <Badge variant="outline" className="gap-1">
              <EyeOff className="w-3 h-3" />
              скрыт
            </Badge>
          )}
          {!item.is_read && perspective === "received" && <Badge variant="warning">не прочитан</Badge>}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {counterpart ? (
            <UserBadge user={counterpart as UserBadgeData} />
          ) : (
            <span>Юзер удалён</span>
          )}
          <span>{formatDateTime(item.created_at)}</span>
        </div>
        {item.message && (
          <p className="text-xs text-muted-foreground line-clamp-1">«{item.message}»</p>
        )}
      </div>
    </div>
  );
}

export function GiftsTab({ userId }: GiftsTabProps) {
  const basePath = `/users/${userId}/gifts`;
  const { searchParams, replace } = useTabUrl(basePath);

  const sentPage = parsePageParam(searchParams, "sent_page");
  const receivedPage = parsePageParam(searchParams, "received_page");

  const { data, isLoading, isError, refetch } = useUserGifts(userId, {
    sent_page: sentPage,
    received_page: receivedPage,
  });

  if (isLoading || !data) return <TabLoading label="Загрузка подарков..." />;
  if (isError) return <TabError label="Не удалось загрузить подарки" onRetry={refetch} />;

  const { sent, received, counts } = data;

  return (
    <div className="space-y-8">
      {/* === Отправленные === */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Send className="w-4 h-4" />
          Отправленные
          <Badge variant="secondary">{counts.sent}</Badge>
        </h3>

        {sent.data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Пользователь не отправлял подарков.</p>
        ) : (
          <div className="space-y-2">
            {sent.data.map((item) => (
              <GiftRow key={item.id} item={item} perspective="sent" />
            ))}
          </div>
        )}

        <MiniPagination
          currentPage={sent.current_page}
          lastPage={sent.last_page}
          from={sent.from}
          to={sent.to}
          total={sent.total}
          onChangePage={(next) =>
            replace((p) => (next <= 1 ? p.delete("sent_page") : p.set("sent_page", String(next))))
          }
        />
      </section>

      {/* === Полученные === */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Inbox className="w-4 h-4" />
          Полученные
          <Badge variant="secondary">{counts.received}</Badge>
        </h3>

        {received.data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Пользователь не получал подарков.</p>
        ) : (
          <div className="space-y-2">
            {received.data.map((item) => (
              <GiftRow key={item.id} item={item} perspective="received" />
            ))}
          </div>
        )}

        <MiniPagination
          currentPage={received.current_page}
          lastPage={received.last_page}
          from={received.from}
          to={received.to}
          total={received.total}
          onChangePage={(next) =>
            replace((p) =>
              next <= 1 ? p.delete("received_page") : p.set("received_page", String(next)),
            )
          }
        />
      </section>

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
