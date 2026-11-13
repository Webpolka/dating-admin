// app/(admin)/system/media/_components/media-crop-rules.tsx
"use client";

import {
  getCollectionConfig,
  getMaxFileSizeMb,
} from "@/config/media-collections";

export function MediaCropRulesView({ collection, label }: { collection: string; label: string }) {
  const config = getCollectionConfig(collection);
  const maxSizeMb = getMaxFileSizeMb(collection);

  return (
    <div className="space-y-2 p-2">
      <h4 className="text-sm font-semibold">Правила для «{label}»</h4>
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>Макс. размер:</span>
          <span className="font-medium text-foreground">{maxSizeMb} MB</span>
        </div>
        <div className="flex justify-between">
          <span>Альфа-канал:</span>
          <span className="font-medium text-foreground">{config.alpha ? "Да" : "Нет"}</span>
        </div>
        <div className="flex justify-between">
          <span>Оригинал:</span>
          <span className="font-medium text-foreground">{config.keep_original ? "Да" : "Нет"}</span>
        </div>
        <div className="pt-2 mt-2 border-t border-border">
          <p className="font-medium text-foreground mb-1">Варианты нарезки:</p>
          <ul className="space-y-1">
            {Object.entries(config.variants).map(([key, v]) => (
              <li key={key} className="flex justify-between gap-2">
                <span className="font-mono text-[10px] bg-muted px-1 rounded">{key}</span>
                <span>
                  {v.size} ({v.fit}, {v.format} {v.quality}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}