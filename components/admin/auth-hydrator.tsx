// Мост: серверный layout → клиентский стор.
"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import type { AdminUser } from "@/lib/types";

export function AuthHydrator({ user }: { user: AdminUser }) {
  // Пишем в эффекте, НЕ во время рендера: на сервере стор — модульный
  // синглтон, запись при SSR смешивала бы юзеров между запросами.
  useEffect(() => {
    useAuthStore.getState().setUser(user);
  }, [user]);

  return null; // ничего не рендерит
}