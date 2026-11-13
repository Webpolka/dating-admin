// app/(admin)/moderation/photos/_components/reject-modal.tsx
"use client";

import { useEffect, useState } from "react";
import {
  useRejectPhoto,
  PHOTO_REJECT_REASONS,
  type PhotoItem,
  type PhotoRejectReason,
} from "@/hooks/admin/use-photos";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ShieldX } from "lucide-react";

export function RejectModal({
  photo,
  onOpenChange,
}: {
  photo: PhotoItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState<PhotoRejectReason | "">("");
  const rejectMutation = useRejectPhoto();

  useEffect(() => {
    if (!photo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReason("");
    }
  }, [photo]);

 const handleConfirm = () => {
  if (!photo || !reason) return;
  rejectMutation.mutate(
    { id: photo.id, reason: reason as PhotoRejectReason },
    {
      onSuccess: () => {
        onOpenChange(false);
      },
    }
  );
};

  return (
    <Dialog open={photo !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg text-destructive">
            <ShieldX className="w-5 h-5" />
            Отклонить фото?
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4 overflow-y-auto little-scroll flex-1">
          {photo && (
            <div className="bg-muted/30 border border-border rounded-md p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ID фото:</span>
                <span className="font-mono font-bold">#{photo.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ID юзера:</span>
                <span className="font-medium">#{photo.user_id}</span>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Выберите причину отклонения. Пользователь получит уведомление.
          </p>

          <div className="flex flex-col gap-2">
            <Label>Причина отклонения</Label>
            <Select
              value={reason}
              onValueChange={(v: string | null) => v && setReason(v as PhotoRejectReason)}
            >
              <SelectTrigger className="w-full">
                {PHOTO_REJECT_REASONS.find(r => r.value === reason)?.label ?? "Выберите причину..."}
              </SelectTrigger>
              <SelectContent>
                {PHOTO_REJECT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border bg-muted/20 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={rejectMutation.isPending}
          >
            Отмена
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            disabled={rejectMutation.isPending || !reason}
          >
            {rejectMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ShieldX className="w-4 h-4 mr-2" />
            )}
            Отклонить фото
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}