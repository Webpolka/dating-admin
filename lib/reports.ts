// lib/reports.ts
// Синхронизировано с App\Enums\ReportReason и App\Enums\ReportResolution

export const REPORT_REASONS: Record<
  string,
  { label: string; color: string }
> = {
  spam: {
    label: "Спам / Реклама",
    color: "bg-secondary text-secondary-foreground",
  },
  porn: {
    label: "Порнография / 18+",
    color: "bg-red-500/10 text-red-500",
  },
  scam: {
    label: "Мошенничество",
    color: "bg-orange-500/10 text-orange-500",
  },
  insult: {
    label: "Оскорбление",
    color: "bg-yellow-500/10 text-yellow-500",
  },
  minor: {
    label: "Несовершеннолетний",
    color: "bg-destructive/10 text-destructive",
  },
  fake: {
    label: "Фейк / Чужие фото",
    color: "bg-purple-500/10 text-purple-500",
  },
};

export const REPORT_RESOLUTIONS: Record<
  string,
  { label: string; color: string }
> = {
  ban: {
    label: "Вечный бан",
    color: "bg-red-500/10 text-red-500",
  },
  temp_ban: {
    label: "Временный бан",
    color: "bg-orange-500/10 text-orange-500",
  },
  shadowban: {
    label: "Теневой бан",
    color: "bg-purple-500/10 text-purple-500",
  },
  warn: {
    label: "Предупреждение",
    color: "bg-yellow-500/10 text-yellow-500",
  },
  photo_deleted: {
    label: "Фото удалено",
    color: "bg-red-500/10 text-red-500",
  },
  no_action: {
    label: "Нет нарушения",
    color: "bg-secondary text-secondary-foreground",
  },
};

export function getReportReason(
  reason: string | null | undefined,
): { label: string; color: string } | null {
  if (!reason) return null;
  return REPORT_REASONS[reason] ?? null;
}

export function getReportResolution(
  resolution: string | null | undefined,
): { label: string; color: string } | null {
  if (!resolution) return null;
  return REPORT_RESOLUTIONS[resolution] ?? null;
}

export const REPORT_STATUSES: Record<
  string,
  { label: string; badgeVariant: "warning" | "success" | "secondary" }
> = {
  pending: { label: "Ожидает", badgeVariant: "warning" },
  resolved: { label: "Решена", badgeVariant: "success" },
  rejected: { label: "Отклонена", badgeVariant: "secondary" },
};

export function getReportStatus(
  status: string | null | undefined,
): {
  label: string;
  badgeVariant: "warning" | "success" | "secondary";
} | null {
  if (!status) return null;
  return REPORT_STATUSES[status] ?? null;
}