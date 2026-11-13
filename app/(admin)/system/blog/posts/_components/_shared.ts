// app/(admin)/system/blog/posts/_components/_shared.ts

import type { BlogPostCounts, BlogStatusFilter, BulkBlogAction } from "@/hooks/admin/use-blog-posts";

// F4: debounce 400ms (стандарт для админки).
export { SEARCH_DEBOUNCE_MS } from "@/lib/constants";

export const PER_PAGE = 15;

export const STATUS_FILTERS: Array<{
  value: BlogStatusFilter;
  label: string;
  countKey: keyof BlogPostCounts;
}> = [
  { value: "all", label: "Все", countKey: "all" },
  { value: "published", label: "Опубликованные", countKey: "published" },
  { value: "draft", label: "Черновики", countKey: "draft" },
  { value: "archived", label: "В архиве", countKey: "archived" },
  { value: "uncategorized", label: "Без рубрики", countKey: "uncategorized" },
];

export const BULK_ACTION_LABELS: Record<BulkBlogAction, string> = {
  publish: "Опубликовать",
  draft: "В черновики",
  archive: "В архив",
  delete: "Удалить навсегда",
};

// Статусы для формы (dropdown в настройках поста).
export const POST_STATUSES: Array<{ value: import("@/hooks/admin/use-blog-posts").BlogPostStatus; label: string }> = [
  { value: "draft", label: "Черновик" },
  { value: "published", label: "Опубликована" },
  { value: "archived", label: "В архиве" },
];