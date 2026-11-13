// config/media-collections.ts

export interface MediaVariant {
  size: string;       // "300x300" или "1200w"
  fit: "cover" | "inside" | "contain";
  format: "webp" | "jpeg" | "png";
  quality: number;
}

export interface MediaCollectionConfig {
  keep_original: boolean;
  max_file_size_kb: number;
  alpha?: boolean;
  variants: Record<string, MediaVariant>;
}

export const MEDIA_COLLECTIONS: Record<string, MediaCollectionConfig> = {
  default: {
    keep_original: true,
    max_file_size_kb: 10240, // 10MB
    variants: {
      thumb: { size: "300x300", fit: "cover", format: "webp", quality: 75 },
      sm:    { size: "500x500", fit: "cover", format: "webp", quality: 75 },
      md:    { size: "800w",    fit: "inside", format: "webp", quality: 80 },
      lg:    { size: "1200w",   fit: "inside", format: "webp", quality: 85 },
    },
  },

  gift: {
    keep_original: true,
    max_file_size_kb: 2048, // 2MB
    alpha: true,
    variants: {
      thumb: { size: "200x200", fit: "cover", format: "webp", quality: 75 },
      sm:    { size: "400x400", fit: "cover", format: "webp", quality: 80 },
      md:    { size: "600x600", fit: "cover", format: "webp", quality: 85 },
      lg:    { size: "800x800", fit: "cover", format: "webp", quality: 90 },
    },
  },

  post: {
    keep_original: false,
    max_file_size_kb: 5120, // 5MB
    variants: {
      thumb: { size: "320x180",   fit: "cover", format: "webp", quality: 75 },
      sm:    { size: "640x360",   fit: "cover", format: "webp", quality: 80 },
      md:    { size: "960x540",   fit: "cover", format: "webp", quality: 85 },
      lg:    { size: "1280x720",  fit: "cover", format: "webp", quality: 85 },
      og:    { size: "1200x630",  fit: "cover", format: "jpeg", quality: 90 },
    },
  },

  notifications: {
    keep_original: false,
    max_file_size_kb: 2048, // 2MB
    variants: {
      thumb: { size: "320x180",  fit: "cover", format: "jpeg", quality: 75 },
      sm:    { size: "640x360",  fit: "cover", format: "jpeg", quality: 80 },
      md:    { size: "800x420",  fit: "cover", format: "jpeg", quality: 85 },
      lg:    { size: "1200x630", fit: "cover", format: "jpeg", quality: 85 },
    },
  },

  banner_desktop: {
    keep_original: false,
    max_file_size_kb: 5120, // 5MB
    variants: {
      thumb: { size: "320x107",   fit: "cover", format: "webp", quality: 75 },
      sm:    { size: "640x213",   fit: "cover", format: "webp", quality: 80 },
      lg:    { size: "1920x640",  fit: "cover", format: "webp", quality: 85 },
    },
  },

  banner_mobile: {
    keep_original: false,
    max_file_size_kb: 5120, // 5MB
    variants: {
      thumb: { size: "300x300",   fit: "cover", format: "webp", quality: 75 },
      sm:    { size: "400x400",   fit: "cover", format: "webp", quality: 80 },
      lg:    { size: "1080x1080", fit: "cover", format: "webp", quality: 85 },
    },
  },
};

// ============================================
// Хелперы для UI
// ============================================

export interface MediaCollectionMeta {
  value: string;
  label: string;
}

export const MEDIA_COLLECTION_LIST: MediaCollectionMeta[] = [
  { value: "default", label: "Общая" },
  { value: "gift", label: "Подарки" },
  { value: "post", label: "Блог" },
  { value: "notifications", label: "Уведомления" },
  { value: "banner_desktop", label: "Баннеры (Desktop)" },
  { value: "banner_mobile", label: "Баннеры (Mobile)" },
];

export function getCollectionConfig(collection: string): MediaCollectionConfig {
  return MEDIA_COLLECTIONS[collection] ?? MEDIA_COLLECTIONS.default;
}

export function getCollectionLabel(collection: string): string {
  return MEDIA_COLLECTION_LIST.find((c) => c.value === collection)?.label ?? collection;
}

export function getMaxFileSizeMb(collection: string): number {
  return Math.round(getCollectionConfig(collection).max_file_size_kb / 1024 * 10) / 10;
}

export function getThumbAspectRatio(collection: string): { css: string; w: number; h: number } {
  const config = getCollectionConfig(collection);
  const thumb = config.variants.thumb;
  if (!thumb) return { css: "1 / 1", w: 1, h: 1 };
  
  const size = thumb.size;
  if (size.includes("w") && !size.includes("x")) {
    const w = parseInt(size.replace(/\D/g, ""), 10) || 300;
    return { css: `${w} / ${w}`, w, h: w };
  }
  const parts = size.toLowerCase().split("x");
  const w = parseInt(parts[0] ?? "300", 10) || 300;
  const h = parseInt(parts[1] ?? String(w), 10) || w;
  return { css: `${w} / ${h}`, w, h };
}

// ============================================
// Получить aspect ratio для DISPLAY (берём lg вариант — как на странице)
// ============================================
export function getDisplayAspectRatio(collection: string): { css: string; w: number; h: number } {
  const config = getCollectionConfig(collection);
  // Приоритет: lg → thumb → первый вариант
  const variant = config.variants.lg ?? config.variants.thumb ?? Object.values(config.variants)[0];
  if (!variant) return { css: "1 / 1", w: 1, h: 1 };
  
  const size = variant.size;
  if (size.includes("w") && !size.includes("x")) {
    const w = parseInt(size.replace(/\D/g, ""), 10) || 300;
    return { css: `${w} / ${w}`, w, h: w };
  }
  const parts = size.toLowerCase().split("x");
  const w = parseInt(parts[0] ?? "300", 10) || 300;
  const h = parseInt(parts[1] ?? String(w), 10) || w;
  return { css: `${w} / ${h}`, w, h };
}

// Кнопки загрузки какие расширения принимать
export function getAcceptedMimeTypes(): string {
  return "image/jpeg,image/png,image/webp,image/gif";
}