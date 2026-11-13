// app/(admin)/system/media/_components/media-info-modal.tsx
"use client";

import { useMediaItemDetail } from "@/hooks/admin/use-media-library";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";

export function MediaInfoModal({
  mediaId,
  onClose,
  onCopyUrl,
}: {
  mediaId: number | null;
  onClose: () => void;
  onCopyUrl: (url: string) => void;
}) {
  const { data: detailData, isLoading } = useMediaItemDetail(mediaId);
  const detail = detailData?.data;

  return (
    <Dialog open={mediaId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col min-h-140">
        <DialogHeader className="px-5 py-3 border-b border-border shrink-0">
          <DialogTitle className="text-sm truncate">
            {detail?.file_name ?? "Загрузка..."}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !detail ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Загрузка...
          </div>
        ) : (
          <div className="flex-1 p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 overflow-y-auto">
            {/* Preview */}
            <div className="bg-muted/10 rounded-lg overflow-hidden border border-border flex items-center justify-center aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={detail.lg_url} alt={detail.file_name} className="w-full h-full object-contain" />
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">ID файла</p>
                  <p className="font-medium">#{detail.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Размер оригинала</p>
                  <p className="font-medium">{(detail.size / 1048576).toFixed(2)} MB</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Тип MIME</p>
                  <p className="font-medium">{detail.mime_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Дата загрузки</p>
                  <p className="font-medium">{formatDateTime(detail.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Коллекция</p>
                  <p className="font-medium">{detail.collection_label}</p>
                </div>
              </div>

              {/* Variants */}
              {detail.variants.length > 0 ? (
                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold mb-2">Сгенерированные варианты:</h4>
                  <div className="space-y-2">
                    {detail.variants.map((v) => (
                      <div key={v.key} className="flex items-center justify-between gap-2 bg-muted/20 p-2 rounded-md">
                        <div className="flex flex-col min-w-0 gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold">{v.key}</span>
                            <span className="text-[10px] text-muted-foreground">
                              ({v.size}, {v.fit}, {v.format})
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate">{v.url}</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => onCopyUrl(v.url)}
                          title="Скопировать ссылку"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pt-4 border-t border-border flex items-center gap-2 text-yellow-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Идет фоновая нарезка вариантов...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}