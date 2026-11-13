// app/(admin)/communication/stop-words/_components/stop-words-edit-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { Pencil, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type {
  StopWordItem,
  StopWordAction as StopWordActionType,
  StopWordCategory as StopWordCategoryType,
} from "@/hooks/admin/use-stop-words";
import { CATEGORY_OPTIONS, ACTION_OPTIONS } from "./stop-words-shared";

// ============================================================
// Модалка редактирования одного стоп-слова
// ============================================================
export function EditStopWordModal({
  open,
  onOpenChange,
  word,
  onSave,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  word: StopWordItem | null;
  onSave: (payload: {
    word: string;
    category: StopWordCategoryType;
    action: StopWordActionType;
    replacement: string;
    is_active: boolean;
  }) => void;
  isLoading: boolean;
}) {
  const [editWord, setEditWord] = useState("");
  const [editCategory, setEditCategory] = useState<StopWordCategoryType>("mat");
  const [editAction, setEditAction] = useState<StopWordActionType>("mask");
  const [editReplacement, setEditReplacement] = useState("***");
  const [editIsActive, setEditIsActive] = useState(true);

  // Синхронизируем local state при открытии/смене слова
  useEffect(() => {
    if (open && word) {
    // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditWord(word.word);
      setEditCategory(word.category);
      setEditAction(word.action);
      setEditReplacement(word.replacement || "***");
      setEditIsActive(word.is_active);
    }
  }, [open, word]);

  const handleSave = () => {
    if (!editWord.trim()) return;
    onSave({
      word: editWord.trim(),
      category: editCategory,
      action: editAction,
      replacement: editAction === "mask" ? editReplacement : "***",
      is_active: editIsActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Pencil className="w-5 h-5" />
            Редактировать стоп-слово
          </DialogTitle>
        </DialogHeader>

        {!word ? (
          <div className="py-4 text-center text-muted-foreground">Загрузка...</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label>Слово или фраза</Label>
              <Input
                value={editWord}
                onChange={(e) => setEditWord(e.target.value.slice(0, 255))}
                className="font-mono text-sm"
                maxLength={255}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Категория</Label>
                <Select
                  value={editCategory}
                  onValueChange={(v: string | null) => v && setEditCategory(v as StopWordCategoryType)}
                >
                  <SelectTrigger className="w-full">
                    {CATEGORY_OPTIONS.find(o => o.value === editCategory)?.label}
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Поведение</Label>
                <Select
                  value={editAction}
                  onValueChange={(v: string | null) => v && setEditAction(v as StopWordActionType)}
                >
                  <SelectTrigger className="w-full">
                    {ACTION_OPTIONS.find(o => o.value === editAction)?.label}
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Replacement — только для mask action */}
            {editAction === "mask" && (
              <div className="flex flex-col gap-2">
                <Label>Замена (replacement)</Label>
                <Input
                  value={editReplacement}
                  onChange={(e) => setEditReplacement(e.target.value.slice(0, 10))}
                  placeholder="***"
                  maxLength={10}
                  className="font-mono"
                />
              </div>
            )}

            {/* Active toggle */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={editIsActive}
                onCheckedChange={(v) => setEditIsActive(v === true)}
                id="edit-is-active"
              />
              <Label htmlFor="edit-is-active" className="text-sm font-normal cursor-pointer">
                Активно (применять фильтр)
              </Label>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Отмена
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isLoading || !editWord.trim()}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}