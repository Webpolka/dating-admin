"use client";

// hooks/admin/use-tab-url.ts
//
// URL-driven state для табов страницы пользователя (/users/{id}/*).
//
// Все табы хранят фильтры и страницу в query-параметрах — ссылка
// шаряема и переживает F5. Раньше каждый таб таскал свою копию
// router.replace + new URLSearchParams + сброс page (см. photos-tab),
// теперь это один хук + два чистых парсера.
//
// Использование:
//
//   const { searchParams, replace } = useTabUrl();
//   const status = parseEnumParam(searchParams, "status", STATUS_VALUES, "all");
//   const page = parsePageParam(searchParams);
//
//   // Смена фильтра (страница сбрасывается на 1):
//   replace((p) => {
//     p.set("status", next);
//     p.delete("page");
//   });
//
//   // Смена страницы (фильтры сохраняются):
//   replace((p) => p.set("page", String(next)));

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Прочитать enum-параметр с защитой от подделки (неизвестное → default). */
export function parseEnumParam<T extends string>(
  searchParams: URLSearchParams,
  name: string,
  allowed: readonly T[],
  defaultValue: T,
): T {
  const raw = searchParams.get(name);
  return raw !== null && (allowed as readonly string[]).includes(raw)
    ? (raw as T)
    : defaultValue;
}

/** Прочитать параметр страницы (>= 1; мусор → 1). */
export function parsePageParam(searchParams: URLSearchParams, name = "page"): number {
  return Math.max(1, parseInt(searchParams.get(name) ?? "1", 10) || 1);
}

/**
 * Точечная замена query-параметров таба через router.replace
 * (без скролла, без новой записи в history).
 */
export function useTabUrl(basePath: string) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const replace = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      router.replace(`${basePath}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, searchParams, basePath],
  );

  return { searchParams, replace };
}
