// config/status-badges.ts
import type { Badge } from "@/components/ui/badge";

type BadgeVariant = React.ComponentProps<typeof Badge>["variant"];

export interface StatusBadgeConfig {
  variant: BadgeVariant;
  label: string;
}

// ============================================
// БЛОГ: посты
// ============================================
export const BLOG_POST_STATUS: Record<string, StatusBadgeConfig> = {
  draft: { variant: "warning", label: "Черновик" },
  published: { variant: "success", label: "Опубликована" },
  archived: { variant: "secondary", label: "В архиве" },
};

// ============================================
// СТАТИЧЕСКИЕ СТРАНИЦЫ
// ============================================
export const PAGE_STATUS: Record<string, StatusBadgeConfig> = {
  active: { variant: "success", label: "Опубликована" },
  draft: { variant: "warning", label: "Черновик" },
};

// ============================================
// ПОЛЬЗОВАТЕЛИ
// ============================================
export const USER_STATUS: Record<string, StatusBadgeConfig> = {
  active: { variant: "success", label: "Активен" },
  banned: { variant: "destructive", label: "Заблокирован" },
  shadowbanned: { variant: "warning", label: "Теневой" },      // ← добавить
  deactivated: { variant: "secondary", label: "Деактивирован" }, // ← добавить
  pending: { variant: "warning", label: "Ожидает" },
};

// ============================================
// МЕДИА
// ============================================
export const MEDIA_STATUS: Record<string, StatusBadgeConfig> = {
  processed: { variant: "success", label: "Готово" },
  processing: { variant: "warning", label: "Обрабатывается" },
  failed: { variant: "destructive", label: "Ошибка" },
};

// ============================================
// ХЕЛПЕР
// ============================================
export function getStatusBadge(
  config: Record<string, StatusBadgeConfig>,
  status: string
): StatusBadgeConfig {
  return config[status] ?? { variant: "secondary", label: status };
}