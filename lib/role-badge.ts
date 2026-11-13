// lib/role-badge.ts

export interface RoleBadgeConfig {
  label: string;
  className: string; // Tailwind классы для бейджа
}

export const ROLE_BADGES: Record<string, RoleBadgeConfig> = {
  admin: {
    label: "Админ",
    className: "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  moderator: {
    label: "Модератор",
    className: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  support: {
    label: "Саппорт",
    className: "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
  },
};

export function getRoleBadge(role: string): RoleBadgeConfig {
  return ROLE_BADGES[role] || { label: role, className: "" };
}