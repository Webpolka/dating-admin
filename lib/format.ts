// lib/format.ts
//
// Все форматтеры null-tolerant: принимают string | null | undefined и
// возвращают "" для пустого значения. Это позволяет вызывать их напрямую
// на опциональных полях API-ответов (created_at?: string | null и т.п.).

/**
 * Форматирует ISO-строку в DD.MM.YYYY
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/**
 * Форматирует ISO-строку в HH:mm:ss
 */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mi}:${ss}`;
}

/**
 * Форматирует ISO-строку в DD.MM.YYYY HH:mm
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ============================================================
// Относительное время ("5 минут назад")
// Используется в diary-comment-item, photo-comment-item и т.д.
// ============================================================

/**
 * Форматирует ISO-строку в относительное время:
 * "только что" / "5 минут назад" / "3 часа назад" / "2 дня назад" / DD.MM.YYYY
 *
 * Русская плюрализация через pluralizeRu.
 */
export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "только что";
  if (diffMin < 60) return `${diffMin} ${pluralizeRu(diffMin, "минуту", "минуты", "минут")} назад`;
  if (diffHour < 24) return `${diffHour} ${pluralizeRu(diffHour, "час", "часа", "часов")} назад`;
  if (diffDay < 7) return `${diffDay} ${pluralizeRu(diffDay, "день", "дня", "дней")} назад`;

  return formatDate(iso);
}

/**
 * Русская плюрализация.
 *
 * @param n число
 * @param one "1 минута" / "1 час" / "1 день"
 * @param few "2 минуты" / "3 часа" / "4 дня"
 * @param many "5 минут" / "11 часов" / "12 дней"
 *
 * Правило: mod10==1 && mod100!=11 → one
 *          mod10 in [2..4] && mod100 not in [10..19] → few
 *          иначе → many
 */
export function pluralizeRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}