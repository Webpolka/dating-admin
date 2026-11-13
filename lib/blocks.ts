// lib/blocks.ts
// Зеркало бэкенд-энума App\Enums\UserBlockReason (dating-api).

export const BLOCK_REASONS: Record<string, { label: string; color: string }> = {
  spam:   { label: "Спам",            color: "bg-red-500/10 text-red-500" },
  insult: { label: "Оскорбление",    color: "bg-orange-500/10 text-orange-500" },
  creepy: { label: "Странный / Мутный", color: "bg-purple-500/10 text-purple-500" },
  scam:   { label: "Мошенничество",   color: "bg-red-500/10 text-red-500" },
  other:  { label: "Другое",          color: "bg-muted text-muted-foreground" },
};

export function getBlockReason(
  reason: string | null | undefined,
): { label: string; color: string } | null {
  if (!reason) return null;
  return BLOCK_REASONS[reason] ?? null;
}