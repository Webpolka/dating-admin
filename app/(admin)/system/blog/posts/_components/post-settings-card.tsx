// app/(admin)/system/blog/posts/_components/post-settings-card.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { MediaPicker } from "@/components/admin/media-picker";
import { formatDateTime } from "@/lib/format";
import type { MediaItem } from "@/hooks/admin/use-media";
import type { BlogPostStatus, BlogPostValidationErrors } from "@/hooks/admin/use-blog-posts";
import { AlignLeft, Image as ImageIcon, Settings, Pin, Plus } from "lucide-react";
import { POST_STATUSES } from "./_shared";

interface BlogCategory {
  id: number;
  name: string;
  posts_count: number;
}

interface Props {
  excerpt: string;
  coverPreviewUrl: string | null;
  coverMediaId: number | null;
  slug: string;
  categoryId: number | null;
  status: BlogPostStatus;
  isFeatured: boolean;
  categories: BlogCategory[];
  errors: BlogPostValidationErrors;
  isEdit: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  viewsCount: number;
  onExcerptChange: (val: string) => void;
  onCoverSelect: (media: MediaItem) => void;
  onCoverRemove: () => void;
  onSlugChange: (val: string) => void;
  onCategoryChange: (val: string | null) => void;
  onStatusChange: (val: string) => void;
  onFeaturedChange: (val: boolean) => void;
  onClearError: (field: string) => void;
  onOpenCategoryModal: () => void;
}

/**
 * Карточка настроек поста: краткое описание, обложка, slug, рубрика,
 * статус, закрепление, мета-информация.
 */
export function PostSettingsCard({
  excerpt,
  coverPreviewUrl,
  coverMediaId,
  slug,
  categoryId,
  status,
  isFeatured,
  categories,
  errors,
  isEdit,
  createdAt,
  updatedAt,
  viewsCount,
  onExcerptChange,
  onCoverSelect,
  onCoverRemove,
  onSlugChange,
  onCategoryChange,
  onStatusChange,
  onFeaturedChange,
//   onClearError,
  onOpenCategoryModal,
}: Props) {
  const hasError = (field: string): boolean => Boolean(errors[field]);
  const getFieldError = (field: string): string | null => {
    const err = errors[field];
    return err && err.length > 0 ? err[0] : null;
  };

  const categoryLabel = categoryId !== null
    ? categories.find((c) => c.id === categoryId)?.name ?? null
    : null;
  const statusLabel = POST_STATUSES.find((s) => s.value === status)?.label ?? null;

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-6">
      {/* Excerpt */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="excerpt" className="text-xs flex items-center gap-1.5">
          <AlignLeft className="w-3.5 h-3.5" />
          Краткое описание
        </Label>
        <Textarea
          id="excerpt"
          value={excerpt}
          onChange={(e) => onExcerptChange(e.target.value)}
          rows={3}
          placeholder="Краткий текст для списка статей и SEO..."
          className={`resize-none text-sm ${hasError("excerpt") ? "border-destructive focus-visible:ring-destructive" : ""}`}
        />
        {getFieldError("excerpt") ? (
          <p className="text-xs text-destructive">{getFieldError("excerpt")}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Если пусто — система возьмет первые строки из основного текста.
          </p>
        )}
      </div>

      <div className="border-t border-border" />

      {/* Cover */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" />
          Обложка поста
        </Label>
        <MediaPicker
          collection="post"
          previewUrl={coverPreviewUrl}
          mediaId={coverMediaId}
          onSelect={onCoverSelect}
          onRemove={onCoverRemove}
          aspect="16/9"
        />
        {getFieldError("cover_media_id") && (
          <p className="text-xs text-destructive">{getFieldError("cover_media_id")}</p>
        )}
      </div>

      <div className="border-t border-border" />

      {/* Settings */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
          <Settings className="w-4 h-4" /> Настройки
        </h3>

        {/* Slug */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="slug" className="text-xs">Slug</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            placeholder="url-posta"
            className={`text-sm ${hasError("slug") ? "border-destructive focus-visible:ring-destructive" : ""}`}
          />
          {getFieldError("slug") && (
            <p className="text-xs text-destructive">{getFieldError("slug")}</p>
          )}
        </div>

        {/* Category */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="category_id" className="text-xs">Рубрика</Label>
          <div className="flex gap-2 items-center">
            <Select
              value={categoryId !== null ? String(categoryId) : ""}
              onValueChange={onCategoryChange}
            >
              <SelectTrigger className={`w-full ${hasError("category_id") ? "border-destructive ring-destructive" : ""}`}>
                {categoryLabel ? (
                  <span>{categoryLabel}</span>
                ) : (
                  <span className="text-muted-foreground">- Без рубрики -</span>
                )}
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} ({c.posts_count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onOpenCategoryModal}
              title="Управление рубриками"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {getFieldError("category_id") && (
            <p className="text-xs text-destructive">{getFieldError("category_id")}</p>
          )}
        </div>

        {/* Status */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="status" className="text-xs">Статус</Label>
          <Select
            value={status}
            onValueChange={(v: string | null) => { if (v) onStatusChange(v); }}
          >
            <SelectTrigger className={`w-full ${hasError("status") ? "border-destructive ring-destructive" : ""}`}>
              <span>{statusLabel}</span>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {POST_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getFieldError("status") && (
            <p className="text-xs text-destructive">{getFieldError("status")}</p>
          )}
        </div>

        {/* Featured toggle */}
        <div className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/30">
          <div className="pr-4 flex items-center gap-2">
            <Pin className="w-5 h-5 text-yellow-500" />
            <div className="flex flex-col">
              <p className="text-sm font-medium leading-tight">Закрепленный пост</p>
              <p className="text-xs text-muted-foreground leading-tight">Выводить первым в списке</p>
            </div>
          </div>
          <Switch
            checked={isFeatured}
            onCheckedChange={onFeaturedChange}
          />
        </div>

        {/* Meta info (edit mode) */}
        {isEdit && (
          <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-4">
            {createdAt && (
              <div className="flex justify-between">
                <span>Создано:</span>
                {/* F10: formatDateTime из lib/format (не локальный) */}
                <span className="text-foreground">{formatDateTime(createdAt)}</span>
              </div>
            )}
            {updatedAt && (
              <div className="flex justify-between">
                <span>Изменено:</span>
                <span className="text-foreground">{formatDateTime(updatedAt)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Просмотров:</span>
              <span className="text-foreground">{viewsCount}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}