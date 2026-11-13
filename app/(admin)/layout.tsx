// app/(admin)/layout.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import axios from "axios";
import { apiServer } from "@/lib/api-server";
import { AdminShell } from "@/components/admin/admin-shell";
import { AuthHydrator } from "@/components/admin/auth-hydrator";
import type { AdminUser } from "@/lib/types";

interface MeResponse {
  authenticated: boolean;
  user: AdminUser;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();

  let user: AdminUser | null = null;

  try {
    const { data } = await apiServer.get<MeResponse>("/me", {
      headers: { Cookie: cookie },
    });

    if (data.authenticated && data.user) {
      user = data.user;
    }
  } catch (e) {
    // Различаем две ситуации:
    //
    // 1. 401 (сессия истекла / не залогинен) — редирект на /login.
    //    Это нормальный flow: пользователь просто не авторизован.
    //
    // 2. 5xx / timeout / network error — бэкенд лежит или недоступен.
    //    Пробрасываем ошибку дальше → Next.js покажет error.tsx
    //    (или дефолтный error page). НЕ редиректим на /login, иначе
    //    получим петлю: /login → /dashboard → /me 5xx → /login → ...
    //    Пользователь будет думать "не залогинен", а реально "бэкенд упал".
    if (axios.isAxiosError(e) && (e.response?.status ?? 0) === 401) {
      // 401 — чистый редирект на логин
      user = null;
    } else {
      // 5xx / network / timeout — пробрасываем, Next.js покажет error page
      console.error("[admin-layout] /me failed (не 401):", e instanceof Error ? e.message : e);
      throw e;
    }
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <AdminShell user={user}>
      <AuthHydrator user={user} />   {/* + гидратор, кормит стор */}
      {children}
    </AdminShell>
  );
}