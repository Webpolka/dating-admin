// components/ui/date-picker.tsx
"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
};

export function DatePicker({ value, onChange, placeholder = "Выберите дату" }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
         <Button
          variant="outline"
          className={cn(
            "w-37.5 justify-between text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
        {date ? format(date, "dd.MM.yyyy", { locale: ru }) : <span>{placeholder}</span>}
          <CalendarIcon className="h-4 w-4" />
        </Button>
      }/>
    <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onChange?.(d ? format(d, "yyyy-MM-dd") : "");
            setOpen(false);
          }}          
          locale={ru}
        />
      </PopoverContent>
    </Popover>
  );
}