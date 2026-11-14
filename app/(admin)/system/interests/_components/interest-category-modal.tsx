// app/(admin)/system/interests/_components/interest-category-modal.tsx
"use client";

import { useState } from "react";
import {
  useInterestCategories,
  useCreateInterestCategory,
  useDeleteInterestCategory,
  type InterestCategory,
} from "@/hooks/admin/use-interest-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Check } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedId: number | null;
  onSelect: (categoryId: number | null) => void;
}

/**
 * Модалка управления категориями интересов.
 * Зеркало CategoryManagerModal для блога: список + создание + удаление.
 * Клик по категории → onSelect(id) и закрытие не происходит (можно
 * продолжить управлять). Удаление — сразу без confirm.
 */
export function InterestCategoryModal({ open, onClose, selectedId, onSelect }: Props) {
  const { data, isLoading } = useInterestCategories();
  const createMutation = useCreateInterestCategory();
  const deleteMutation = useDeleteInterestCategory();
  const [newName, setNewName] = useState("");

  const categories: InterestCategory[] = data?.data ?? [];

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createMutation.mutate({ name }, {
      onSuccess: (created) => {
        onSelect(created.id);
        setNewName("");
      },
    });
  };

  const handleDelete = (category: InterestCategory) => {
    if (selectedId === category.id) onSelect(null);
    deleteMutation.mutate(category.id);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle>Управление категориями интересов</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* List */}
          <div className="max-h-60 overflow-y-auto pr-2 space-y-1 border-b border-border pb-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : categories.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                Пока нет ни одной категории
              </p>
            ) : (
              categories.map((c) => {
                const isSelected = selectedId === c.id;
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 group"
                  >
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      className={`flex-1 text-sm font-medium hover:text-primary truncate text-left ${
                        isSelected ? "text-primary" : ""
                      }`}
                    >
                      {c.name}
                    </button>

                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {c.interests_count}
                    </span>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(c)}
                      disabled={deleteMutation.isPending}
                      title="Удалить категорию"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          {/* Create */}
          <div className="flex gap-2">
            <Input
              placeholder="Название новой категории..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              maxLength={50}
            />
            <Button onClick={handleCreate} disabled={!newName.trim() || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Добавить
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Готово
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
