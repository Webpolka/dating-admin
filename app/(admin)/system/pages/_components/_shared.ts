// app/(admin)/system/pages/_components/_shared.ts

export { SEARCH_DEBOUNCE_MS } from "@/lib/constants";
export const PER_PAGE = 15;

export const STATUS_FILTERS: Array<{
  value: string;
  label: string;
  countKey: "all" | "active" | "draft";
}> = [
  { value: "all", label: "Все", countKey: "all" },
  { value: "active", label: "Опубликованные", countKey: "active" },
  { value: "draft", label: "Черновики", countKey: "draft" },
];

export const BULK_ACTION_LABELS: Record<string, string> = {
  activate: "Опубликовать",
  draft: "Снять с публикации",
  delete: "Удалить",
};

export interface PageValidationErrors {
  title?: string[];
  slug?: string[];
  meta_title?: string[];
  meta_description?: string[];
  body?: string[];
  [key: string]: string[] | undefined;
}