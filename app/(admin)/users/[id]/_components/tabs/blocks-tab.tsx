"use client";

// app/(admin)/users/[id]/_components/tabs/blocks-tab.tsx
//
// Таб «Блокировки»: юзерские блокировки «юзер → юзер» (фича приложения).
// Две колонки: кого заблокировал ПОЛЬЗОВАТЕЛЬ и кто заблокировал ЕГО.
// Пагинация обеих живёт в URL (?blocked_page=N&blockers_page=N).
//
// Причины блокировок — App\Enums\UserBlockReason на бэке
// (spam, insult, creepy, scam, other) — зеркалятся в lib/blocks.ts.
//
// ВАЖНО про импорты (исправлено в ЧАСТИ 3.5):
//   - getBlockReason живёт в @/lib/blocks (НЕ в @/lib/api/users —
//     в репо такого экспорта нет, был несуществующий импорт)
//   - тип пагинатора — конкретный UserBlocksPaginated (НЕ дженерик
//     Paginated<T>, которого в репо тоже не существует)
//   - timeAgo → formatRelativeTime из @/lib/format (timeAgo нет в репо)

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import Link from "next/link";
import { UserX, ShieldX, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UserBadge } from "@/components/admin/user-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { MiniPagination } from "@/components/admin/mini-pagination";
import { TabLoading, TabError } from "@/components/admin/tab-states";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { getBlockReason } from "@/lib/blocks";
import type { UserBlockListItem, UserBlocksPaginated } from "@/lib/api/users";
import { useUserBlocks, useUnblockUser } from "@/hooks/admin/use-users";

interface BlocksTabProps {
  userId: number;
}

export function BlocksTab({ userId }: BlocksTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const blockedPage = Number(searchParams.get("blocked_page") ?? "1") || 1;
  const blockersPage = Number(searchParams.get("blockers_page") ?? "1") || 1;

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useUserBlocks(userId, {
    blocked_page: blockedPage,
    blockers_page: blockersPage,
  });

  /** Смена страницы одной из колонок: патчим только свой параметр. */
  const setPage = useCallback(
    (key: "blocked_page" | "blockers_page", page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page <= 1) {
        params.delete(key);
      } else {
        params.set(key, String(page));
      }
      router.replace(`/users/${userId}/blocks?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, userId],
  );

  if (isLoading) {
    return <TabLoading label="Загрузка блокировок..." />;
  }

  if (isError) {
    return <TabError label="Не удалось загрузить блокировки" onRetry={refetch} />;
  }

  if (!data) {
    return <TabLoading label="Загрузка блокировок..." />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <BlocksColumn
        title="Заблокировал"
        icon={UserX}
        iconColor="text-blue-500"
        paginator={data.blocked}
        userId={userId}
        onChangePage={(p) => setPage("blocked_page", p)}
        emptyText="Пользователь никого не блокировал."
      />

      <BlocksColumn
        title="Заблокировали его"
        icon={ShieldX}
        iconColor="text-destructive"
        paginator={data.blockers}
        userId={userId}
        onChangePage={(p) => setPage("blockers_page", p)}
        emptyText="Пользователя никто не блокировал."
      />
    </div>
  );
}

// ============================================
// КОЛОНКА БЛОКИРОВОК
// ============================================

function BlocksColumn({
  title,
  icon: Icon,
  iconColor,
  paginator,
  userId,
  onChangePage,
  emptyText,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  paginator: UserBlocksPaginated;
  userId: number;
  onChangePage: (page: number) => void;
  emptyText: string;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor}`} /> {title} ({paginator.total})
      </h3>

      {paginator.data.length === 0 ? (
        <div className="p-4 bg-muted/20 rounded-lg border border-border text-center text-xs text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {paginator.data.map((block) => (
              <BlockRow key={block.id} block={block} userId={userId} />
            ))}
          </div>

          <MiniPagination
            currentPage={paginator.current_page}
            lastPage={paginator.last_page}
            from={paginator.from}
            to={paginator.to}
            total={paginator.total}
            onChangePage={onChangePage}
          />
        </>
      )}
    </div>
  );
}

// ============================================
// СТРОКА БЛОКИРОВКИ
// ============================================

function BlockRow({ block, userId }: { block: UserBlockListItem; userId: number }) {
  const unblock = useUnblockUser();

  // Диалог подтверждения вместо window.confirm.
  const [confirmOpen, setConfirmOpen] = useState(false);

  const reason = getBlockReason(block.reason);

  const handleUnblock = () => {
    unblock.mutate(
      { userId, blockId: block.id },
      { onSettled: () => setConfirmOpen(false) },
    );
  };

  return (
    <div className="p-3 bg-card border border-border rounded-lg space-y-2">
      {/* Связанный юзер (кого заблокировал / кто заблокировал) */}
      {block.user ? (
        <Link href={`/users/${block.user.id}`} className="block hover:opacity-80 transition-opacity">
          <UserBadge user={block.user} size="sm" />
        </Link>
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <span className="text-sm text-muted-foreground italic">Удалён</span>
        </div>
      )}

      {/* Причина + дата + кнопка принудительного снятия */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {reason ? (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${reason.color}`}
            >
              {reason.label}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground italic">Причина не указана</span>
          )}

          {block.created_at && (
            <span
              className="text-[10px] text-muted-foreground"
              title={formatDateTime(block.created_at)}
            >
              {formatRelativeTime(block.created_at)}
            </span>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setConfirmOpen(true)}
          disabled={unblock.isPending}
          className="text-destructive hover:text-destructive h-7 w-7"
          title="Снять блокировку"
        >
          {unblock.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Снять блокировку?"
        description={
          block.user
            ? `Принудительно разблокировать ${block.user.name}? Обычно это не требуется — блокировки создаются самими пользователями.`
            : "Принудительно снять эту блокировку?"
        }
        confirmText="Снять"
        variant="destructive"
        isLoading={unblock.isPending}
        onConfirm={handleUnblock}
      />
    </div>
  );
}
