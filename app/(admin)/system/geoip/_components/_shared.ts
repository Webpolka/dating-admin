// app/(admin)/system/geoip/_components/_shared.ts
//
// Общие константы для страницы GeoIP локаций.

import type { GeoType } from "@/hooks/admin/use-geoip-locations";

// Debounce для поиска. 400мс — стандарт для админки.
export { SEARCH_DEBOUNCE_MS } from "@/lib/constants";

// Количество локаций на странице.
export const PER_PAGE = 50;

export const TYPE_FILTERS: Array<{ value: GeoType; label: string }> = [
  { value: "country", label: "Страны" },
  { value: "region", label: "Регионы" },
  { value: "city", label: "Города" },
];

export const TYPE_LABELS: Record<GeoType, string> = {
  country: "Страна",
  region: "Регион",
  city: "Город",
};