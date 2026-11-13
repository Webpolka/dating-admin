// components/admin/media-picker.tsx
"use client";

import { useState } from "react";
import { MediaManager } from "./media-manager";
import { Button } from "@/components/ui/button";
import { ImagePlus, RefreshCw, Trash2, ImageOff } from "lucide-react";
import type { MediaItem } from "@/hooks/admin/use-media";

interface MediaPickerProps {
  collection: string;
  previewUrl: string | null;
  mediaId: number | null;
  onSelect: (media: MediaItem) => void;
  onRemove: () => void;
  aspect?: string;
}

export function MediaPicker({
  collection,
  previewUrl,
  mediaId,
  onSelect,
  onRemove,
  aspect = "16/9",
}: MediaPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 border border-dashed border-border rounded-lg p-3 bg-muted/10">
      {/* Квадратная область: картинка на весь квадрат ИЛИ иконка по центру */}
      <div
        className="w-full flex items-center justify-center bg-background rounded-lg overflow-hidden border border-border"
        style={{ aspectRatio: aspect }}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Cover preview" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2">
            <ImagePlus className="w-10 h-10 text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground">Нет изображения</span>
          </div>
        )}
      </div>

      {/* Кнопки — всегда внизу, под квадратом */}
      {previewUrl ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={() => setOpen(true)}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Заменить
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="w-full gap-1.5"
            onClick={onRemove}
          >
            <Trash2 className="w-3.5 h-3.5" /> Удалить
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => setOpen(true)}
        >
          <ImageOff className="w-3.5 h-3.5" />
          Выбрать из хранилища
        </Button>
      )}

      <MediaManager
        open={open}
        onClose={() => setOpen(false)}
        onSelect={onSelect}
        collection={collection}
        title="Выбор обложки"
      />
    </div>
  );
}
