// app/(admin)/system/broadcasts/_components/broadcast-confirm-modal.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, ListChecks, Save } from "lucide-react";
import type { BroadcastType } from "@/hooks/admin/use-broadcasts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  type: BroadcastType;
  scheduledAt: string;
  audienceSummary: string;
  isEdit: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
}

/**
 * Модалка подтверждения перед сохранением рассылки.
 * Показывает сводку: аудиторию, тип, заголовок, дату планирования.
 */
export function BroadcastConfirmModal({
  open,
  onOpenChange,
  title,
  type,
  scheduledAt,
  audienceSummary,
  isEdit,
  isSubmitting,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-full">
              <ListChecks className="w-6 h-6 text-blue-500" />
            </div>
            Проверка перед сохранением
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Убедитесь, что параметры рассылки настроены верно.
          </p>

          <div className="bg-muted/30 border border-border rounded-md p-4 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Аудитория:</p>
              <p className="text-sm font-medium">{audienceSummary}</p>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground uppercase mb-1">Тип уведомления:</p>
              <p className="text-sm font-medium">
                {type === "in_app" ? "В приложении (Колокольчик)" : type === "email" ? "Email (Письмо)" : "Push (Уведомление)"}
              </p>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground uppercase mb-1">Заголовок:</p>
              <p className="text-sm font-medium">{title}</p>
            </div>
            {scheduledAt && (
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground uppercase mb-1">Отправка запланирована:</p>
                <p className="text-sm font-medium">
                  {new Date(scheduledAt).toLocaleString("ru-RU")}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? "Сохранить изменения" : scheduledAt ? "Запланировать" : "Сохранить черновик"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}