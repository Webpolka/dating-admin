"use client";

// components/admin/status-tabs.tsx
//
// Ряд кнопок-фильтров по статусу с иконкой и счётчиком.
//
// Заменяет копипасту `.map(t => <Button>...<Badge>{counts[t.value]}</Badge>)`,
// повторявшуюся в каждом списочном компоненте (фото, жалобы, дневники,
// стоп-слова, транзакции...). Конфиг табов (value/label/icon/iconColor)
// остаётся в page-shared файле раздела — это доменная справка, а вот
// рендер теперь один.
//
// Счётчики передаются колбэком getCount, потому что у каждого раздела
// своя логика: где-то counts[value], где-то stats.total для "all".

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface StatusTabDef<V extends string = string> {
  /** Значение фильтра (уходит в API и URL). */
  value: V;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Tailwind text-* класс цвета иконки (напр. "text-yellow-500"). */
  iconColor?: string;
}

interface StatusTabsProps<V extends string> {
  tabs: ReadonlyArray<StatusTabDef<V>>;
  value: V;
  onChange: (value: V) => void;
  /** Счётчик для таба; null/undefined → «—». */
  getCount?: (value: V) => number | null | undefined;
  /** Блокировка на время запроса. */
  disabled?: boolean;
}

export function StatusTabs<V extends string>({
  tabs,
  value,
  onChange,
  getCount,
  disabled = false,
}: StatusTabsProps<V>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const count = getCount?.(tab.value);
        return (
          <Button
            key={tab.value}
            variant={value === tab.value ? "default" : "secondary"}
            size="sm"
            onClick={() => onChange(tab.value)}
            className="gap-1.5"
            disabled={disabled}
          >
            <Icon className={`w-4 h-4 ${tab.iconColor ?? ""}`} />
            {tab.label}
            <Badge variant="secondary" className="text-[10px] h-5 px-1">
              {count ?? "—"}
            </Badge>
          </Button>
        );
      })}
    </div>
  );
}
