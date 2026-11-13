"use client";

// app/(admin)/users/_components/ban-user-dialog.tsx
//
// Диалог бана: тип блокировки + причина (+ длительность для temp-бана).
// Используется в ДВУХ местах: список юзеров (users-page-client) и
// шапка карточки юзера (header-actions-menu) — логика бана не дублируется.
//
// Компонент монтируется с key={banTarget.userId}, поэтому useState
// инициализируется заново на каждого юзера — ручной reset не нужен.

import { useState } from "react";
import { Clock, Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BAN_DURATION_PRESETS, BAN_REASONS } from "@/lib/api/users";
import type { BanType, BanReason } from "@/lib/api/users";

interface BanUserDialogProps {
  target: { userId: number; type: BanType } | null;
  isPending: boolean;
  onClose: () => void;
  /** Вызывается с выбранным типом, причиной и (для temp) длительностью в днях. */
  onSubmit: (type: BanType, reason: BanReason, days?: number) => void;
}

const BAN_TYPE_OPTIONS: Array<{ value: BanType; label: string; hint: string }> = [
  { value: "shadow", label: "Теневой бан", hint: "Юзер не догадается: для него всё работает, но его не видят другие" },
  { value: "temp", label: "Временный бан", hint: "Автоматически снимется по истечении срока" },
  { value: "permanent", label: "Вечный бан", hint: "Полная блокировка навсегда" },
];

// Дефолтная длительность temp-бана (та же, что на бэке при days=null).
const DEFAULT_DAYS = 3;

export function BanUserDialog({ target, isPending, onClose, onSubmit }: BanUserDialogProps) {
  const [type, setType] = useState<BanType>(target?.type ?? "shadow");
  const [reason, setReason] = useState<BanReason | "">("");
  const [days, setDays] = useState<number>(DEFAULT_DAYS);

  if (!target) return null;

  // Ручная блокировка закрытия во время запроса — иначе двойные сабмиты.
  const handleOpenChange = (open: boolean) => {
    if (!open && !isPending) onClose();
  };

  const handleSubmit = () => {
    if (reason === "") return;
    onSubmit(type, reason, type === "temp" ? days : undefined);
  };

  const selectedType = BAN_TYPE_OPTIONS.find((t) => t.value === type);

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Блокировка пользователя</DialogTitle>
          <DialogDescription>
            Выбери тип блокировки и обязательную причину — она попадёт в лог
            администратора и в уведомление пользователю.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Тип блокировки */}
          <div className="space-y-1.5">
            <Label>Тип блокировки</Label>
            <Select value={type} onValueChange={(v) => v && setType(v as BanType)}>
              <SelectTrigger>
                <SelectValue>
                  {(v: string | null) => BAN_TYPE_OPTIONS.find((t) => t.value === v)?.label ?? v}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BAN_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedType && (
              <p className="text-xs text-muted-foreground">{selectedType.hint}</p>
            )}
          </div>

          {/* Длительность — только для temp-бана */}
          {type === "temp" && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Длительность
              </Label>
              <Select value={String(days)} onValueChange={(v) => v && setDays(Number(v))}>
                <SelectTrigger>
                  <SelectValue>
                    {(v: string | null) =>
                      BAN_DURATION_PRESETS.find((p) => String(p.value) === v)?.label ?? v
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {BAN_DURATION_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Причина (обязательная) */}
          <div className="space-y-1.5">
            <Label>
              Причина <span className="text-destructive">*</span>
            </Label>
            <Select value={reason} onValueChange={(v) => v && setReason(v as BanReason)}>
              <SelectTrigger>
                <SelectValue>
                  {(v: string | null) =>
                    v === null
                      ? "Выберите причину..."
                      : BAN_REASONS.find((r) => r.value === v)?.label ?? v
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BAN_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Отмена</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isPending || reason === ""}>
            {isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Заблокировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}