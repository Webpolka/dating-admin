"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Settings,
  EyeOff,
  Clock,
  Lock,
  Unlock,
  Trash2,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { UserDetail, BanType, BanReason, DeletionReason } from "@/lib/api/users";
import {
  useBanUser,
  useUnbanUser,
  useDeactivateUser,
  useRestoreUser,
} from "@/hooks/admin/use-users";
import { BanUserDialog } from "../../../users/_components/ban-user-dialog";
import { DeactivateUserDialog } from "../../../users/_components/deactivate-user-dialog";

interface HeaderActionsMenuProps {
  user: UserDetail;
}

/**
 * Выпадающее меню действий над пользователем в шапке детальной страницы.
 *
 * Переиспользует те же универсальные диалоги `BanUserDialog` и
 * `DeactivateUserDialog`, что и страница списка юзеров (см.
 * `app/(admin)/users/_components/users-page-client.tsx`). Управление
 * состоянием "какой диалог открыт и для какого юзера" — локальный
 * `useState` (target-or-null pattern). Это сознательно: один
 * инстанс меню = один набор диалогов; не нужен глобальный стор.
 *
 * После успешного действия НЕ делаем `window.location.reload()` —
 * инвалидируем кеш TanStack Query, чтобы страница обновилась плавно,
 * без потери активного таба.
 */
export function HeaderActionsMenu({ user }: HeaderActionsMenuProps) {
  const queryClient = useQueryClient();

  const [banTarget, setBanTarget] = useState<{ userId: number; type: BanType } | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<{ userId: number; userName: string } | null>(null);

  const ban = useBanUser();
  const unban = useUnbanUser();
  const deactivate = useDeactivateUser();
  const restore = useRestoreUser();

  const isBanned = user.status === "banned" || user.status === "shadowbanned";
  const isDeleted = !!user.deleted_at;

  const handleBanSubmit = (type: BanType, reason: BanReason) => {
    if (!banTarget) return;
    ban.mutate(
      { userId: banTarget.userId, type, reason },
      { onSuccess: () => setBanTarget(null) },
    );
  };

  // Раньше тут был дубликат функции с мусорной сигнатурой
  // `Parameters<typeof handleBanSubmit> extends never ? never : import(...).DeletionReason`
  // — это вызывало TS-ошибку `Duplicate function implementation`.
  const handleDeactivateSubmit = (reason: DeletionReason) => {
    if (!deactivateTarget) return;
    deactivate.mutate(
      { userId: deactivateTarget.userId, reason },
      { onSuccess: () => setDeactivateTarget(null) },
    );
  };

  // Плавная инвалидация вместо полной перезагрузки страницы.
  // useUserStatusMutation уже инвалидирует ["user-detail"] (префикс),
  // но тут дёргаем точный ключ, чтобы гарантированно перезапросить именно
  // этого юзера без перебоев других открытых вкладок.
  const refreshUser = () => {
    void queryClient.invalidateQueries({ queryKey: ["user-detail", user.id] });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button variant="outline" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
        }/>
        <DropdownMenuContent align="end">
          {isDeleted ? (
            <>
              <DropdownMenuLabel>Аккаунт удалён</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() =>
                    restore.mutate(user.id, { onSuccess: refreshUser })
                  }
                >
                  <RotateCcw className="w-4 h-4 text-green-500" /> Восстановить
                </DropdownMenuItem>
                <DropdownMenuItem render={
                  <Link href="/users"><ArrowLeft className="w-4 h-4" /> Назад к списку</Link>
                }/>
              </DropdownMenuGroup>
            </>
          ) : (
            <>
              <DropdownMenuLabel>Действия</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {isBanned ? (
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() =>
                      unban.mutate(user.id, { onSuccess: refreshUser })
                    }
                  >
                    <Unlock className="w-4 h-4 text-green-500" /> Разбанить
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              ) : (
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setBanTarget({ userId: user.id, type: "shadow" })}>
                    <EyeOff className="w-4 h-4 text-purple-500" /> Теневой бан...
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setBanTarget({ userId: user.id, type: "temp" })}>
                    <Clock className="w-4 h-4 text-yellow-500" /> Бан на 3 дня...
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setBanTarget({ userId: user.id, type: "permanent" })}>
                    <Lock className="w-4 h-4 text-red-500" /> Вечный бан...
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    setDeactivateTarget({ userId: user.id, userName: user.name })
                  }
                >
                  <Trash2 className="w-4 h-4" /> Удалить...
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <BanUserDialog
        key={banTarget ? `ban-${banTarget.userId}` : "ban-closed"}
        target={banTarget}
        isPending={ban.isPending}
        onClose={() => setBanTarget(null)}
        onSubmit={handleBanSubmit}
      />

      <DeactivateUserDialog
        key={deactivateTarget ? `deact-${deactivateTarget.userId}` : "deact-closed"}
        target={deactivateTarget}
        isPending={deactivate.isPending}
        onClose={() => setDeactivateTarget(null)}
        onSubmit={handleDeactivateSubmit}
      />
    </>
  );
}
