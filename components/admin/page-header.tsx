"use client";

// components/admin/page-header.tsx
//
// Шапка списочной страницы: [кнопка «назад»] + иконка + заголовок
// (+ бейдж) + описание, справа — «Обновить» или произвольные действия.
//
// Заменяет копипасту одного и того же блока flex из ~20 страниц
// (ArrowLeft + h1 + Badge + p + RefreshCw).

import { ArrowLeft, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  /** Иконка в заголовке. */
  icon?: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  /** Бейдж рядом с заголовком (например, «N новых»). */
  badge?: React.ReactNode;
  /** Серая строка под заголовком. */
  description?: React.ReactNode;
  /** Кнопка «назад» слева. Обычно () => router.back(). */
  onBack?: () => void;
  /** Кнопка «Обновить» справа. Передай refetch. */
  onRefresh?: () => void;
  /** Прокидывается из useQuery ( крутится иконка обновления). */
  isFetching?: boolean;
  /** Кастомные действия справа вместо/вместе с «Обновить». */
  actions?: React.ReactNode;
}

export function PageHeader({
  icon: Icon,
  title,
  badge,
  description,
  onBack,
  onRefresh,
  isFetching = false,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Назад">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            {Icon && <Icon className="w-6 h-6" />}
            {title}
            {badge}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>

      {(onRefresh || actions) && (
        <div className="flex items-center gap-2">
          {actions}
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              Обновить
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Переиспользуемый деструктивный бейдж «N новых» для заголовка. */
export function NewCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Badge variant="destructive" className="text-[10px] h-5 px-1.5 ml-1">
      {count} новых
    </Badge>
  );
}
