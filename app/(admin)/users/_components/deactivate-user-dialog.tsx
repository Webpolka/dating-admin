"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DELETION_REASONS, type DeletionReason } from "@/lib/api/users";

interface DeactivateUserDialogProps {
  target: { userId: number; userName: string } | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (reason: DeletionReason) => void;
}

export function DeactivateUserDialog({
  target,
  isPending,
  onClose,
  onSubmit,
}: DeactivateUserDialogProps) {
  const [reason, setReason] = useState<DeletionReason | "">("");

  if (!target) return null;

  const canSubmit = reason !== "";

  return (
    <Dialog open onOpenChange={(o) => !o && !isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" /> Деактивация аккаунта
          </DialogTitle>
          <DialogDescription>
            Аккаунт <span className="font-bold text-foreground">{target.userName}</span> будет
            деактивирован (soft delete). Можно восстановить позже.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Причина деактивации <span className="text-destructive">*</span>
            </label>
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as DeletionReason)}
            >
              <SelectTrigger>
                <SelectValue>
                  {(v: string) =>
                    v === ""
                      ? "Выберите причину..."
                      : DELETION_REASONS.find((r) => r.value === v)?.label ?? v
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DELETION_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={() => reason !== "" && onSubmit(reason as DeletionReason)}
            disabled={isPending || !canSubmit}
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Деактивировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}