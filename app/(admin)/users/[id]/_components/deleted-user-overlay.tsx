"use client";

// app/(admin)/users/[id]/_components/deleted-user-overlay.tsx
//
// Оверлей поверх страницы удалённого (soft-deleted) юзера:
// данные остаются читаемыми, но страница «заморожена».
//
// ВАЖНО: после восстановления НЕ делаем window.location.reload() —
// useRestoreUser инвалидирует ["admin", "users"] и React Query сам
// обновит деталь. Хард-релоад выкидывал из текущего таба.

import { useState } from "react";
import Link from "next/link";
import { Snowflake, X, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRestoreUser } from "@/hooks/admin/use-users";
import type { UserDetail } from "@/lib/api/users";

interface DeletedUserOverlayProps {
  user: UserDetail;
}

export function DeletedUserOverlay({ user }: DeletedUserOverlayProps) {
  // Позволяем скрыть оверлей и просто читать данные замороженного профиля.
  const [show, setShow] = useState(true);
  const restore = useRestoreUser();

  if (!show) return null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none bg-blue-500/5 backdrop-blur-[1px] rounded-lg pb-12">
      <div className="relative flex flex-col items-center gap-2 p-6 pointer-events-auto bg-card/95 border border-dashed border-border rounded-xl shadow-2xl text-center max-w-sm">
        <button
          onClick={() => setShow(false)}
          className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Закрыть и просмотреть данные"
        >
          <X className="w-4 h-4" />
        </button>

        <Snowflake className="w-12 h-12 text-blue-500 animate-pulse" />
        <span className="font-bold text-lg">Аккаунт деактивирован</span>
        <p className="text-sm text-muted-foreground">
          Пользователь заморожен. Данные доступны для просмотра и копирования.
        </p>

        <div className="flex items-center gap-3 mt-4">
          <Button
            onClick={() => restore.mutate(user.id)}
            disabled={restore.isPending}
            size="sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Восстановить аккаунт
          </Button>
          <Button variant="outline" size="sm" render={
            <Link href="/users">
              <ArrowLeft className="w-4 h-4 mr-2" /> К списку
            </Link>
          }/>
        </div>
      </div>
    </div>
  );
} 