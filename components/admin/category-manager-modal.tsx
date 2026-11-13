// components/admin/category-manager-modal.tsx
"use client";

import { useState } from "react";
import { useBlogCategories, useCreateBlogCategory, useDeleteBlogCategory, type BlogCategory } from "@/hooks/admin/use-blog-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Check } from "lucide-react";

interface CategoryManagerModalProps {
  open: boolean;
  onClose: () => void;
  selectedId: number | null;
  onSelect: (categoryId: number | null) => void;
}

export function CategoryManagerModal({ open, onClose, selectedId, onSelect }: CategoryManagerModalProps) {
  const { data, isLoading } = useBlogCategories();
  const createMutation = useCreateBlogCategory();
  const deleteMutation = useDeleteBlogCategory();
  const [newName, setNewName] = useState("");

  const categories: BlogCategory[] = data?.data ?? [];

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createMutation.mutate(name, {
      onSuccess: (created) => {
        onSelect(created.id);
        setNewName("");
      },
    });
  };

  // Без confirm-модалки — удаляем сразу
  const handleDelete = (category: BlogCategory) => {
    if (selectedId === category.id) onSelect(null);
    deleteMutation.mutate(category.id);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle>Управление рубриками</DialogTitle>
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
                Пока нет ни одной рубрики
              </p>
            ) : (
              categories.map((c) => {
                const isSelected = selectedId === c.id;
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 group"
                  >
                    {/* Галочка слева — показывает выбранную рубрику */}
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

                    <span className="text-xs text-muted-foreground shrink-0">({c.posts_count})</span>

                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      disabled={deleteMutation.isPending}
                      className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-all shrink-0"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Create new */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Создать новую</label>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Например: Психология"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleCreate}
                disabled={createMutation.isPending || !newName.trim()}
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Добавить
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Готово
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}