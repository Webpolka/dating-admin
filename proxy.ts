// proxy.ts
//
// Next.js 16 Proxy (бывший middleware). Дока:
// https://nextjs.org/docs/app/api-reference/file-conventions/proxy
//
// Файл должен называться строго proxy.ts (или .js) в корне проекта.
// В Next.js 16 middleware.ts deprecated, заменён на proxy.ts.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Имя сессионной куки.
//
// Берём из env NEXT_PUBLIC_SESSION_COOKIE — должно совпадать с SESSION_COOKIE
// на бэке (см. dating-api/.env.example). Фолбэк "dating_session" — это дефолт
// бэка (см. config/session.php → Str::slug(APP_NAME) + "-session" при
// APP_NAME="Dating App" → "dating-app-session", но в .env.example явно
// зафиксировано dating_session).
//
// ВАЖНО: если на бэке переименуют SESSION_COOKIE и забудут синкнуть сюда,
// proxy перестанет делать optimistic-редирект гостей на /login (кука с другим
// именем не найдётся). Реальная защита от этого — серверный layout через
// /api/admin/me (см. app/(admin)/layout.tsx), proxy лишь оптимизация.
const SESSION_COOKIE = process.env.NEXT_PUBLIC_SESSION_COOKIE ?? "dating_session";

const PUBLIC_PATHS = ["/login"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasCookie = Boolean(request.cookies.get(SESSION_COOKIE));

  // Гость без куки лезет на защищённый путь → /login с параметром возврата
  if (!hasCookie && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  // ⚠️ Правила «кука есть → гнать с /login на /dashboard» здесь НЕТ НАРОЧНО.
  // Proxy не может проверить ВАЛИДНОСТЬ куки (SESSION_ENCRYPT=true), а после
  // логаута кука остаётся в браузере. Старое правило давало петлю:
  // /login → /dashboard → /me 401 → /login → ♾️
  // Кто залогинен по-настоящему — решает серверный лейаут через /api/admin/me.

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sanctum|storage|broadcasting|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};