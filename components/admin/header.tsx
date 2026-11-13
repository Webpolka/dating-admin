// components/admin/header.tsx
"use client";

import { useState } from "react";
import { LogOut, Crown, MonitorSmartphone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { authApi } from "@/lib/api/auth";
import { extractErrorMessage } from "@/lib/api";
import type { AdminUser } from "@/lib/types";
import { logout } from "@/store/auth-store";

interface HeaderProps {
  user: AdminUser | null;
}

export function Header({ user }: HeaderProps) {
  // --- Состояние для ConfirmDialog "Завершить другие сессии" ---
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);

  // --- Состояние для ConfirmDialog "Выйти" ---
  // Отдельное от isConfirmOpen, потому что два разных действия —
  // пользователь может открыть один диалог, потом передумать и
  // открыть другой. С одним state был бы конфликт.
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Реальный выход из админки.
   *
   * Вызывается ТОЛЬКО из confirm-dialog (не напрямую из кнопки хедера).
   * logout() из store/auth-store.ts делает:
   *   1. POST /api/admin/logout (инвалидирует сессию на бэке)
   *   2. Сбрасывает Zustand store (user = null)
   *   3. window.location.href = "/login" — hard redirect, сносит кэш роутера
   *
   * ВАЖНО про finally: window.location.href запускает навигацию, но JS
   * продолжает выполняться до момента фактической замены страницы.
   * setIsLoggingOut(false) сработает, но реальный unmount произойдёт
   * чуть позже при навигации. На всякий случай оставляем finally,
   * чтобы не зависло состояние если навигация затянется.
   */
  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      // После logout() всегда редирект на /login, дальше код не выполнится
      // в текущем JS-контексте — страница заменится.
    } catch (error) {
      // logout() внутри себя ловит ошибки и в finally всё равно редиректит.
      // Сюда попадём только если что-то совсем экзотическое сломалось
      // ДО api.post (например, store недоступен). Показываем toast,
      // не закрываем диалог — юзер может retry.
      console.error("Logout failed:", error);
      toast.error("Не удалось выйти", {
        description: "Попробуйте ещё раз или обновите страницу.",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  /**
   * Завершить все другие сессии текущего юзера.
   *
   * Текущая сессия остаётся живой — админ не выкинет сам себя.
   * После успеха показываем toast с количеством завершённых сессий
   * (0 = других активных сессий не было, всё равно считается успехом —
   * пользователь просто узнаёт, что чистить было нечего).
   *
   * При ошибке (401/500/сеть) — toast с конкретным сообщением от бэка.
   * Перелогинивать не надо: текущая сессия валидна, провалился только
   * запрос на cleanup других.
   */
  const handleTerminateOtherSessions = async () => {
    setIsTerminating(true);
    try {
      const result = await authApi.logoutEverywhere();

      if (result.sessions_deleted > 0) {
        toast.success(
          `Завершено сессий: ${result.sessions_deleted}`,
          { description: "Текущая сессия сохранена. Все остальные устройства вышли из админки." },
        );
      } else {
        toast.info("Других активных сессий не найдено", {
          description: "Только этот браузер сейчас авторизован.",
        });
      }

      setIsConfirmOpen(false);
    } catch (error) {
      // extractErrorMessage возвращает человекочитаемый текст из любого
      // формата ошибки (422 / 403 / 429 / 500 / сетевая). См. lib/api.ts.
      const message = extractErrorMessage(error, "Не удалось завершить сессии. Попробуйте позже.");
      toast.error("Ошибка", { description: message });

      // Не закрываем диалог при ошибке — пусть юзер видит что произошло
      // и может либо retry, либо отменить. Кнопка подтверждения снова активна.
    } finally {
      setIsTerminating(false);
    }
  };

  const adminTitle = user?.is_founder
    ? "Суперадмин"
    : user?.role === "moderator"
    ? "Модератор"
    : user?.role === "support"
    ? "Саппорт"
    : "Админка";

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/70 backdrop-blur-md px-4 lg:h-15 lg:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <div className="flex items-center gap-2">
        <span className="font-semibold text-lg text-foreground hidden sm:inline">
          {adminTitle}
        </span>
        {user?.is_founder && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
            <Crown className="w-3 h-3" />
            Владелец
          </span>
        )}
      </div>

      <div className="flex-1" />

      <ThemeSwitcher />

      {/* Завершить другие сессии — отдельная кнопка-иконка рядом с "Выйти".
          На desktop показываем текст "Другие сессии", на мобиле — только иконку.
          title-атрибут на мобиле заменяет отсутствующий текст (tooltip при тапе). */}
      <button
        onClick={() => setIsConfirmOpen(true)}
        disabled={isTerminating}
        className={buttonVariants({
          variant: "outline",
          size: "sm",
          className: "text-muted-foreground hover:text-foreground",
        })}
        title="Завершить другие сессии"
        aria-label="Завершить другие сессии"
      >
        {isTerminating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <MonitorSmartphone className="w-4 h-4" />
        )}
        <span className="ml-1.5 hidden md:inline">Другие сессии</span>
      </button>

      <button
        onClick={() => setIsLogoutConfirmOpen(true)}
        disabled={isLoggingOut}
        className={buttonVariants({
          variant: "outline",
          size: "sm",
          className: "text-muted-foreground hover:text-foreground",
        })}
      >
        {isLoggingOut ? (
          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
        ) : (
          <LogOut className="w-4 h-4 mr-1.5" />
        )}
        Выйти
      </button>

      {/* Confirm dialog для "Завершить другие сессии".
          variant="destructive" потому что действие необратимое:
          завершённые сессии сразу дохнут, "отменить" нельзя.
          isLoading крутит спиннер в кнопке подтверждения и блокирует Cancel. */}
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          // Не даём закрыть диалог во время запроса — иначе спиннер останется
          // висеть на "висящем" диалоге. Юзер должен дождаться ответа или
          // отменить ДО отправки запроса.
          if (isTerminating && !open) return;
          setIsConfirmOpen(open);
        }}
        title="Завершить другие сессии?"
        description="Все остальные активные сессии этого аккаунта будут немедленно завершены. Текущий браузер останется авторизованным. Действие необратимо."
        confirmText="Завершить"
        cancelText="Отмена"
        variant="destructive"
        isLoading={isTerminating}
        onConfirm={() => {
          void handleTerminateOtherSessions();
        }}
      />

      {/* Confirm dialog для "Выйти".
          variant="default" (НЕ destructive) — выход обратим, юзер может
          залогиниться обратно. Красная кнопка была бы излишне алармистской.
          После confirm — вызывается logout() из store/auth-store.ts, который
          делает POST /api/admin/logout + hard redirect на /login.
          isLoading крутит спиннер в кнопке подтверждения и блокирует Cancel. */}
      <ConfirmDialog
        open={isLogoutConfirmOpen}
        onOpenChange={(open) => {
          // Та же логика блокировки закрытия во время запроса,
          // что и у диалога "Завершить другие сессии".
          if (isLoggingOut && !open) return;
          setIsLogoutConfirmOpen(open);
        }}
        title="Выйти из админки?"
        description="Сессия будет завершена. Для продолжения работы потребуется заново ввести email и пароль."
        confirmText="Выйти"
        cancelText="Отмена"
        variant="default"
        isLoading={isLoggingOut}
        onConfirm={() => {
          void handleConfirmLogout();
        }}
      />
    </header>
  );
}