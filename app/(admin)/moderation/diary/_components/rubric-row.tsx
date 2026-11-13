// app/(admin)/moderation/diary/_components/rubric-row.tsx
"use client";

import { useRef, useEffect, useState } from "react";

import {
  useToggleRubricStatus,
  type DiaryRubric,
} from "@/hooks/admin/use-diaries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, MoreHorizontal, Pencil, Trash2, Power, Globe } from "lucide-react";

export function RubricRow({
  rubric,
  isHighlighted = false,
  index = 0,
  onEdit,
  onDelete,
}: {
  rubric: DiaryRubric;
  isHighlighted?: boolean;
  index?: number;
  onEdit?: (rubric: DiaryRubric) => void;
  onDelete?: (rubric: DiaryRubric) => void;
}) {
  const ref = useRef<HTMLTableRowElement>(null);
  const toggleMutation = useToggleRubricStatus();
  const [showToggleConfirm, setShowToggleConfirm] = useState(false);

  useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  const rowClassName = [
    "border-b border-border transition-colors",
    isHighlighted ? "bg-blue-50 dark:bg-blue-950/40 " : "",
    !rubric.is_active ? "opacity-60" : "",
  ].filter(Boolean).join(" ");

  const handleToggleConfirm = () => {
    toggleMutation.mutate(rubric.id, {
      onSettled: () => setShowToggleConfirm(false),
    });
  };

  return (
    <TableRow
      ref={ref}
      className={`${rowClassName} animate-in fade-in slide-in-from-bottom-1 duration-300`}
      style={{ animationDelay: `${Math.min(index * 15, 400)}ms`, animationFillMode: "backwards" }}
    >
      {/* ID */}
      <TableCell className={`text-xs font-mono whitespace-nowrap tabular-nums align-top pt-3 ${isHighlighted ? "text-primary font-bold" : "text-muted-foreground"}`}>
        #{rubric.id}
      </TableCell>

      {/* Сорт. */}
      <TableCell className="text-sm text-muted-foreground tabular-nums align-top pt-3">{rubric.sort_order}</TableCell>

      {/* Название */}
      <TableCell className="align-top pt-3 min-w-0">
        <button
          onClick={() => onEdit?.(rubric)}
          className="text-sm font-medium hover:text-primary text-left flex items-center gap-1.5"
        >
          <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="truncate">{rubric.name}</span>
        </button>
      </TableCell>

      {/* Описание */}
      <TableCell className="align-top pt-3 min-w-0">
        {rubric.description ? (
          <p className="text-xs text-muted-foreground line-clamp-1">{rubric.description}</p>
        ) : (
          <span className="text-xs text-muted-foreground italic opacity-60">—</span>
        )}
      </TableCell>

      {/* Кол-во постов */}
      <TableCell className="align-top pt-3 text-center">
        <Badge variant="outline" className="text-[10px] tabular-nums">{rubric.diaries_count}</Badge>
      </TableCell>

      {/* Статус — кнопка-переключатель */}
      <TableCell className="align-top pt-3">
        <button
          onClick={() => setShowToggleConfirm(true)}
          disabled={toggleMutation.isPending && toggleMutation.variables === rubric.id}
          className="focus:outline-none"
          title={rubric.is_active ? "Скрыть рубрику" : "Активировать рубрику"}
        >
          {toggleMutation.isPending && toggleMutation.variables === rubric.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : rubric.is_active ? (
            <Badge variant="success" className="text-[10px]">Активна</Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">Скрыта</Badge>
          )}
        </button>
      </TableCell>

      {/* Действия */}
      <TableCell className="text-right align-top pt-3">
        {/* modal={false} — иначе base-ui Menu блокирует page scroll пока dropdown открыт. */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger render={
            <Button variant="ghost" size="icon-sm" disabled={toggleMutation.isPending}>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          }/>
          <DropdownMenuContent align="end" className="min-w-42">
            <DropdownMenuItem onClick={() => onEdit?.(rubric)}>
              <Pencil className="w-4 h-4" /> Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowToggleConfirm(true)}>
              <Power className="w-4 h-4" /> {rubric.is_active ? "Скрыть" : "Активировать"}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onDelete?.(rubric)}>
              <Trash2 className="w-4 h-4" /> Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>

      {/* ConfirmDialog — toggle status */}
      <ConfirmDialog
        open={showToggleConfirm}
        onOpenChange={(open) => { if (!open) setShowToggleConfirm(false); }}
        title={rubric.is_active ? "Скрыть рубрику?" : "Активировать рубрику?"}
        description={rubric.is_active
          ? "Рубрика будет скрыта — пользователи не смогут её выбрать при создании дневника. Существующие записи не пострадают."
          : "Рубрика снова станет доступна для выбора при создании дневника."
        }
        confirmText={rubric.is_active ? "Скрыть" : "Активировать"}
        cancelText="Отмена"
        variant="default"
        isLoading={toggleMutation.isPending && toggleMutation.variables === rubric.id}
        onConfirm={handleToggleConfirm}
      />
    </TableRow>
  );
}
