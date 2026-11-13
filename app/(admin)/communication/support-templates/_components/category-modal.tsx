"use client";

import { useState, useEffect } from "react";
import type { SupportCategoryItem, CategoryFormData } from "@/hooks/admin/use-support-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Folder, Save, Loader2 } from "lucide-react";

export function CategoryModal({
  open,
  onOpenChange,
  category,
  onSave,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: SupportCategoryItem | null;
  onSave: (data: CategoryFormData) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  useEffect(() => {
    if (!open) return;
    if (category) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(category.name);
      setSlug(category.slug);
      setIsActive(category.is_active);
      setSortOrder(category.sort_order);
    } else {
      setName("");
      setSlug("");
      setIsActive(true);
      setSortOrder(0);
    }
  }, [open, category]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      slug: slug.trim() || undefined,
      is_active: isActive,
      sort_order: sortOrder,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Folder className="w-5 h-5" />
            {category ? "Редактирование категории" : "Новая категория"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4 overflow-y-auto little-scroll">
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Название</Label>
            <Input placeholder="Например: Оплата" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs">Slug (только латиница, цифры, дефис. Оставьте пустым для автогенерации)</Label>
            <Input placeholder="payment" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={category?.is_system} />
            {category?.is_system && (
              <p className="text-xs text-yellow-600">Системная категория — slug нельзя изменить</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} />
              <span className="text-sm">Активна</span>
            </label>
            <div className="flex items-center gap-2">
              <Label className="text-xs m-0">Порядок:</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="max-w-20" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-muted/20 shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isLoading}>Отмена</Button>
          <Button size="sm" onClick={handleSave} disabled={isLoading || !name.trim()}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {category ? "Сохранить" : "Создать"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}