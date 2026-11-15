// app/(admin)/system/interests/_components/_shared.ts

import type { InterestCounts, BulkInterestAction } from "@/hooks/admin/use-interests";

// Debounce поиска — единый для всей админки.
export { SEARCH_DEBOUNCE_MS } from "@/lib/constants";

export const PER_PAGE = 15;

/**
 * Табы-фильтры списка интересов.
 * value: "all" | "uncategorized" | число(category_id).
 * countKey сопоставляется с InterestCounts (для boosted — отдельное поле,
 * для конкретной категории счётчика нет → undefined).
 */
export const CATEGORY_FILTERS_PRESET = [
  { value: "all", label: "Все", countKey: "all" as const },
  { value: "uncategorized", label: "Без категории", countKey: "uncategorized" as const },
  { value: "boosted", label: "В бусте", countKey: "boosted" as const },
] as const;

export const BULK_ACTION_LABELS: Record<BulkInterestAction, string> = {
  delete: "Удалить навсегда",
  set_category: "Перенести в категорию",
};
