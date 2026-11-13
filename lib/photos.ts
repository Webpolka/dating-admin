// lib/photos.ts
//
// Зеркало бэкенд-энума App\Enums\PhotoRejectReason (dating-api).
//
// Конвенция: причины отказа (как и BlockReason/ReportReason) живут в lib/,
// НЕ внутри хука. До этого файла PHOTO_REJECT_REASONS и getRejectReasonLabel
// жили в hooks/admin/use-photos.ts — нарушение консистентности с lib/blocks.ts
// и lib/reports.ts. ЧАСТЬ 7: вынесены сюда.
//
// Состав причин:
//   - ПОЛЬЗОВАТЕЛЬСКИЕ (модератор выбирает в Select при reject) — 6 штук:
//     porn, minor, ad, stolen, low_quality, other.
//   - СИСТЕМНЫЕ (ставит только ProcessApprovedPhoto job или ModeratePhotoAction
//     при массовых операциях) — НЕ показываются в Select, НО нужны
//     для getRejectReasonLabel чтобы показать русский лейбл на уже
//     отклонённых системой фото. Системные: file_missing, too_large,
//     processing_error, mass_reject.
//
// Бэкенд-валидатор: Rule::in(PhotoRejectReason::userValues()) в
// PhotoController::reject() — пропускает ТОЛЬКО пользовательские.

/** Пользовательские причины (то, что модератор может выбрать в Select). */
export type PhotoRejectReason =
  | "porn"
  | "minor"
  | "ad"
  | "stolen"
  | "low_quality"
  | "other";

/** Все причины (включая системные) — для отображения лейбла. */
export type PhotoRejectReasonAny = PhotoRejectReason | "mass_reject" | "file_missing" | "too_large" | "processing_error";

/**
 * Список для Select в RejectModal. Только пользовательские причины —
 * системные (file_missing/too_large/processing_error/mass_reject)
 * модератор выбрать не может, их ставит только бэкенд.
 */
export const PHOTO_REJECT_REASONS: Array<{ value: PhotoRejectReason; label: string }> = [
  { value: "porn", label: "Порнография" },
  { value: "minor", label: "Несовершеннолетний" },
  { value: "ad", label: "Реклама / Контакты" },
  { value: "stolen", label: "Чужое фото" },
  { value: "low_quality", label: "Плохое качество" },
  { value: "other", label: "Другое" },
];

/**
 * Системные лейблы — НЕ в PHOTO_REJECT_REASONS (скрыты из Select),
 * НО нужны чтобы показывать русский label на фото, отклонённых системой
 * (ProcessApprovedPhoto: file_missing/too_large/processing_error;
 *  ModeratePhotoAction::rejectAllForUser: 'other', но контекст bulk
 *  живёт в admin_logs.action, не в reject_reason).
 */
const SYSTEM_REJECT_LABELS: Record<string, string> = {
  file_missing: "Файл не найден",
  too_large: "Превышен размер",
  processing_error: "Ошибка обработки",
  mass_reject: "Массовое отклонение",
};

/**
 * Лейбл причины по значению — для бейджа на отклонённом фото.
 * Сначала ищет в PHOTO_REJECT_REASONS (пользовательские),
 * потом в SYSTEM_REJECT_LABELS (системные),
 * потом fallback на само значение (неизвестный reason — не должно случаться,
 * но на случай рассинхрона бэка и фронта).
 *
 * null-tolerant: принимает string | null | undefined.
 */
export function getRejectReasonLabel(reason: string | null | undefined): string | null {
  if (!reason) return null;
  return (
    PHOTO_REJECT_REASONS.find((r) => r.value === reason)?.label ??
    SYSTEM_REJECT_LABELS[reason] ??
    reason
  );
}
