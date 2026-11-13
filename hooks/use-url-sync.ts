"use client";

// hooks/use-url-sync.ts
//
// Синхронизация query-параметров страницы с URL (replace, без скролла).
//
// Все списочные страницы хранят фильтры/пагинацию в URL, чтобы ссылка
// была шаряемой и пережила F5. Раньше в каждой странице был свой
// useEffect с router.replace + eslint-disable exhaustive-deps —
// теперь страница собирает строку параметров в useMemo (deps явно
// перечислены) и передаёт её сюда.
//
// Использование:
//
//   const qs = useMemo(() => {
//     const p = new URLSearchParams();
//     if (search) p.set("q", search);
//     if (status !== "pending") p.set("status", status);
//     if (page > 1) p.set("page", String(page));
//     return p.toString();
//   }, [search, status, page]);
//
//   useUrlSync(qs);

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useUrlSync(queryString: string) {
  const router = useRouter();

  useEffect(() => {
    // Пустая строка — тоже валидный кейс: "?..." затирает все параметры.
    router.replace(queryString ? `?${queryString}` : "?", { scroll: false });
  }, [router, queryString]);
}
