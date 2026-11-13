// app/(admin)/moderation/diary/_components/delete-rubric-modal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  useDestroyRubric,
  type DiaryRubric,
} from "@/hooks/admin/use-diaries";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";

// Sentinel value для "Оставить без рубрики" — shadcn Select не работает с value=""
const NONE_VALUE = "__none__";

export function DeleteRubricModal({
  open,
  onOpenChange,
  rubric,
  allRubrics,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rubric: DiaryRubric | null;
  allRubrics: { id: number; name: string }[];
}) {
  const [reassignValue, setReassignValue] = useState<string>(NONE_VALUE);

  const destroyMutation = useDestroyRubric();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setReassignValue(NONE_VALUE);
  }, [open]);

  const handleConfirm = () => {
    if (!rubric) return;
    const reassignId = reassignValue === NONE_VALUE ? null : Number(reassignValue);
    destroyMutation.mutate(
      { id: rubric.id, reassignId },
      {
        // onSuccess — диалог закрывается ТОЛЬКО при успехе.
        // При ошибке остаётся открытым, модератор видит toast и может retry.
        onSuccess: () => onOpenChange(false)
      }
    );
  };

  // Доступные рубрики для переноса — исключаем удаляемую
  const availableForReassign = rubric
    ? allRubrics.filter(r => r.id !== rubric.id)
    : allRubrics;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" /> Удаление рубрики
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <DialogDescription>
            Вы собираетесь удалить рубрику <span className="font-bold text-foreground">«{rubric?.name}»</span>.
          </DialogDescription>

          {rubric && rubric.diaries_count > 0 ? (
            <>
              <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-foreground">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  В этой рубрике находится <span className="font-bold">{rubric.diaries_count}</span> записей.
                  Выберите, куда их перенести, иначе они останутся без рубрики.
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Перенести записи в:</Label>
                <Select
                  value={reassignValue}
                  onValueChange={(v) => setReassignValue(v ?? NONE_VALUE)}
                >
                  <SelectTrigger>
                    {reassignValue === NONE_VALUE
                      ? "Оставить без рубрики"
                      : availableForReassign.find(r => String(r.id) === reassignValue)?.name ?? "Оставить без рубрики"
                    }
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Оставить без рубрики</SelectItem>
                    {availableForReassign.map(r => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
              В этой рубрике нет записей. Можно удалять безопасно.
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={destroyMutation.isPending}>
            Отмена
          </Button>
          <Button variant="destructive" size="sm" onClick={handleConfirm} disabled={destroyMutation.isPending}>
            {destroyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Удалить рубрику
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}