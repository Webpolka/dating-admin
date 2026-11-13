// Клиентский стор админа.
//
// ВАЖНО: `user` в этом сторе — НЕ источник правды для UI!
// Источник правды — это:
//   1. Server layout (app/(admin)/layout.tsx) → /api/admin/me
//   2. AdminUserContext (components/admin/admin-user-context.tsx)
//
// UI-компоненты читают user через useAdminUser() или из props — НЕ из стора.
//
// Этот стор нужен ТОЛЬКО для:
//   - logout() — экшен, который сбрасывает user перед hard redirect
//   - Гидратора (AuthHydrator) — записывает user в эффекте, чтобы
//     потенциальные будущие actions могли его прочитать через
//     useAuthStore.getState().user
// 
// Если в новом компоненте нужен user — используй useAdminUser(), а не
// useAuthStore((s) => s.user). Это предотвращает рассинхрон между
// context (синхронно доступен при первом рендере) и store (заполняется
// в useEffect, т.е. на один кадр позже).

import { create } from "zustand";
import api from "@/lib/api";
import type { AdminUser } from "@/lib/types";

type AuthState = {
  user: AdminUser | null;                 // null, пока гидратор не наполнит
  setUser: (user: AdminUser | null) => void;
  reset: () => void;                      // алиас setUser(null)
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  reset: () => set({ user: null }),
}));

/**
 * ЕДИНЫЙ логаут для хедера и сайдбара (вместо двух копий):
 * POST /api/admin/logout (X-XSRF-TOKEN подставит интерсептор lib/api.ts)
 * → чистим стор → жёсткий window.location.href = "/login" (сносит кэш роутера,
 * middleware видит гостя, Back не воскрешает мёртвую админку).
 */
export async function logout(): Promise<void> {
  try {
    await api.post("/admin/logout");
  } catch (error) {
    console.error("Logout failed:", error);
  } finally {
    useAuthStore.getState().reset();
    window.location.href = "/login";
  }
}