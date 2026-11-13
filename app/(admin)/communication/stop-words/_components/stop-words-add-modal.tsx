// app/(admin)/communication/stop-words/_components/stop-words-add-modal.tsx
"use client";

import { Plus, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { StopWordAction as StopWordActionType, StopWordCategory as StopWordCategoryType } from "@/hooks/admin/use-stop-words";
import { CATEGORY_OPTIONS, ACTION_OPTIONS } from "./stop-words-shared";

// ============================================================
// Модалка массового добавления стоп-слов
// ============================================================
export function AddStopWordsModal({
  open,
  onOpenChange,
  bulkWords,
  setBulkWords,
  modalCategory,
  setModalCategory,
  modalAction,
  setModalAction,
  modalReplacement,
  setModalReplacement,
  onSave,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bulkWords: string;
  setBulkWords: (v: string) => void;
  modalCategory: StopWordCategoryType;
  setModalCategory: (v: StopWordCategoryType) => void;
  modalAction: StopWordActionType;
  setModalAction: (v: StopWordActionType) => void;
  modalReplacement: string;
  setModalReplacement: (v: string) => void;
  onSave: () => void;
  isLoading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Plus className="w-5 h-5" />
            Добавить стоп-слова
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label>Слова или фразы</Label>
            <Textarea
              rows={5}
              placeholder={"Введите слова через запятую или с новой строки...\nНапример:\nказино\nтелеграм, тг, @scammer"}
              value={bulkWords}
              onChange={(e) => setBulkWords(e.target.value)}
              className="resize-none font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Система автоматически пропустит дубликаты.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Категория</Label>
              <Select
                value={modalCategory}
                onValueChange={(v: string | null) => v && setModalCategory(v as StopWordCategoryType)}
              >
                <SelectTrigger className="w-full">
                  {CATEGORY_OPTIONS.find(o => o.value === modalCategory)?.label}
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
                value={modalAction}
                onValueChange={(v: string | null) => v && setModalAction(v as StopWordActionType)}
              >
                <SelectTrigger className="w-full">
                  {ACTION_OPTIONS.find(o => o.value === modalAction)?.label}
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
          {modalAction === "mask" && (
            <div className="flex flex-col gap-2">
              <Label>Замена (replacement)</Label>
              <Input
                value={modalReplacement}
                onChange={(e) => setModalReplacement(e.target.value.slice(0, 10))}
                placeholder="***"
                maxLength={10}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Текст, на который заменяется стоп-слово в сообщении. По умолчанию ***. Максимум 10 символов.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Отмена
          </Button>
          <Button size="sm" onClick={onSave} disabled={isLoading || !bulkWords.trim()}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Добавить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
