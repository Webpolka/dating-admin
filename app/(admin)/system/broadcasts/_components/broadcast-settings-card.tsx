// app/(admin)/system/broadcasts/_components/broadcast-settings-card.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { cn } from "cn";
import { format } from "date-fns";
import { CalendarIcon, Info, Settings } from "lucide-react";
import type { BroadcastType } from "@/hooks/admin/use-broadcasts";

interface Props {
  type: BroadcastType;
  scheduledAt: string;
  isLocked: boolean;
  onTypeChange: (type: BroadcastType) => void;
  onScheduledAtChange: (iso: string) => void;
}

/**
 * Карточка параметров отправки: тип уведомления + планирование.
 */
export function BroadcastSettingsCard({
  type,
  scheduledAt,
  isLocked,
  onTypeChange,
  onScheduledAtChange,
}: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4">
      <h3 className="text-sm font-medium flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
        <Settings className="w-4 h-4" /> Параметры отправки
      </h3>

      {/* Type */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs">Тип уведомления <span className="text-destructive">*</span></Label>
        <Select
          value={type}
          onValueChange={(v: string | null) => { if (v) onTypeChange(v as BroadcastType); }}
        >
          {/* min-w-[220px] — чтобы dropdown не съедал длинные опции
              ("Push (Мобильное/Web)" самая длинная). Без этого dropdown
              принимает ширину триггера, и текст обрезается. */}
          <SelectTrigger disabled={isLocked} className="w-full min-w-54">
            {type === "in_app" ? "В приложении (Колокольчик)" : type === "email" ? "Email (Письмо)" : "Push (Мобильное/Web)"}
          </SelectTrigger>
          <SelectContent className="min-w-54">
            <SelectItem value="in_app">В приложении (Колокольчик)</SelectItem>
            <SelectItem value="email">Email (Письмо)</SelectItem>
            <SelectItem value="push">Push (Мобильное/Web)</SelectItem>
          </SelectContent>
        </Select>
        {type === "email" && (
          <p className="text-xs text-blue-500 flex gap-1">
            <Info className="w-3 h-3" /> Отправится только тем, у кого включена настройка «Email».
          </p>
        )}
        {type === "push" && (
          <p className="text-xs text-green-500 flex gap-1">
            <Info className="w-3 h-3" /> Отправится только тем, у кого включены Push-уведомления.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="scheduledAt" className="text-xs">Запланировать отправку</Label>
        <Popover>
          <PopoverTrigger render={
            <Button
              type="button"
              variant="outline"
              disabled={isLocked}
              className={cn(
                "w-full justify-start text-left font-normal",
                !scheduledAt && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              {scheduledAt ? format(new Date(scheduledAt), "dd.MM.yyyy HH:mm") : <span>Выберите дату и время</span>}
            </Button>
          }/>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={scheduledAt ? new Date(scheduledAt) : undefined}
              onSelect={(d) => {
                // Сохраняем дату, сохраняя текущее время или ставим начало
                const date = d ?? new Date();
                const current = scheduledAt ? new Date(scheduledAt) : new Date();
                date.setHours(current.getHours());
                date.setMinutes(current.getMinutes());
                // Формат для datetime-local
                const tzOffset = date.getTimezoneOffset() * 60000;
                const localISO = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
                onScheduledAtChange(localISO);
              }}
            />
            <div className="p-3 border-t border-border flex items-center gap-2">
              <Label className="text-xs">Время:</Label>
              <Input
                type="time"
                value={scheduledAt ? scheduledAt.split('T')[1] : "12:00"}
                onChange={(e) => {
                  const date = scheduledAt ? new Date(scheduledAt) : new Date();
                  const [h, m] = e.target.value.split(':');
                  date.setHours(parseInt(h), parseInt(m));
                  const tzOffset = date.getTimezoneOffset() * 60000;
                  const localISO = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
                  onScheduledAtChange(localISO);
                }}
                disabled={isLocked}
              />
            </div>
          </PopoverContent>
        </Popover>
        {!scheduledAt && (
          <p className="text-xs text-muted-foreground">Если пусто — сохранится как черновик.</p>
        )}
      </div>
    </div>
  );
}