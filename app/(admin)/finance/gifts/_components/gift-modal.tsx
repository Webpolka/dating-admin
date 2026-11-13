// app/(admin)/finance/gifts/_components/gift-modal.tsx
"use client";

import { useState, useEffect } from "react";
import type {
  GiftItem,
  GiftFormData,
  GiftCategory as GiftCategoryType,
  GiftType as GiftTypeType,
} from "@/hooks/admin/use-gifts";
import type { MediaItem } from "@/hooks/admin/use-media";
import { MediaPicker } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Gift, Loader2, Save } from "lucide-react";
import { CATEGORY_OPTIONS, TYPE_OPTIONS } from "./_shared";

export function GiftModal({
  open,
  onOpenChange,
  gift,
  onSave,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gift: GiftItem | null;
  onSave: (data: GiftFormData, onError: (errors: Record<string, string[]>) => void) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [imageUrl, setImageUrl] = useState("");           // disk_path для БД
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // полный URL для <img>
  const [mediaId, setMediaId] = useState<number | null>(null);
  const [price, setPrice] = useState("100");
  const [category, setCategory] = useState<GiftCategoryType>("romantic");
  const [type, setType] = useState<GiftTypeType>("main");
  const [isActive, setIsActive] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Сброс формы при открытии/закрытии модалки или смене gift.
  // React 19 ругается на setState в effect — подавляем, т.к. это правильный
  // паттерн синхронизации state с props.
  useEffect(() => {
    if (!open) return;
    if (gift) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(gift.name);      
      setSlug(gift.slug);      
      setImageUrl(gift.raw_image);            // disk_path для БД      
      setPreviewUrl(gift.image_url || null);  // полный URL (accessor Storage::url) для превью      
      setMediaId(null);      
      setPrice(String(gift.price));      
      setCategory(gift.category as GiftCategoryType ?? "romantic");      
      setType(gift.type ?? "main");      
      setIsActive(gift.is_active);
    } else {      
      setName("");      
      setSlug("");      
      setImageUrl("");      
      setPreviewUrl(null);      
      setMediaId(null);      
      setPrice("100");      
      setCategory("romantic");      
      setType("main");      
      setIsActive(true);
    }
    
    setFieldErrors({});
  }, [open, gift]);

  // Авто-генерация slug из name при создании (только если slug пустой).
  const handleNameChange = (value: string) => {
    setName(value);
    if (!gift) {
      const autoSlug = value.toLowerCase()
        .replace(/[^a-z0-9\-_ ]/g, "")
        .replace(/\s+/g, "_")
        .substring(0, 50);
      setSlug(autoSlug);
    }
  };

  // При смене типа на "Услуги" — категория не нужна (бэкенд обнулит).
  const handleTypeChange = (newType: GiftTypeType) => {
    setType(newType);
    if (newType === "services") {
      setCategory(null as unknown as GiftCategoryType);
    } else if (!category) {
      setCategory("romantic");
    }
  };

  // Выбор изображения через MediaPicker.
  const handleMediaSelect = (media: MediaItem) => {
    setImageUrl(media.disk_path);              // disk_path для БД
    setPreviewUrl(media.sm_url || media.url);  // оптимизированный URL для превью
    setMediaId(media.id);
  };

  const handleMediaRemove = () => {
    setImageUrl("");
    setPreviewUrl(null);
    setMediaId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({}); // сбрасываем ошибки перед отправкой

    // Фронтенд-валидация (быстрая, без запроса).
    const errors: Record<string, string[]> = {};
    if (!name.trim()) errors.name = ["Название обязательно"];
    if (!slug.trim()) errors.slug = ["Slug обязателен"];
    else if (!/^[a-z0-9\-_]+$/.test(slug.trim())) errors.slug = ["Только строчные латинские буквы, цифры, дефис и подчёркивание"];
    if (!imageUrl?.trim()) errors.image_url = ["Изображение обязательно"];
    if (!price || Number(price) < 1) errors.price = ["Цена должна быть не менее 1"];
    // Категория обязательна только для non-services.
    if (type !== "services" && !category) {
      errors.category = ["Категория обязательна"];
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    onSave(
      {
        name: name.trim(),
        slug: slug.trim(),
        image_url: imageUrl?.trim() || "",
        price: Number(price),
        category: type === "services" ? null : category,
        type,
        is_active: isActive,
      },
      (backendErrors) => {
        setFieldErrors(backendErrors);
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Gift className="w-5 h-5" />
            {gift ? "Редактировать подарок" : "Добавить подарок"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto little-scroll flex-1">
            {/* Layout: слева MediaPicker (квадратный 1/1), справа все инпуты в одну колонку */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              {/* ЛЕВАЯ КОЛОНКА — только ImagePicker (квадратный) */}
              <div className="flex flex-col gap-2">
                <Label>Изображение подарка</Label>
                <MediaPicker
                  collection="gift"
                  previewUrl={previewUrl}
                  mediaId={mediaId}
                  onSelect={handleMediaSelect}
                  onRemove={handleMediaRemove}
                  aspect="1/1"
                />
                {fieldErrors.image_url && (
                  <p className="text-xs text-destructive">{fieldErrors.image_url[0]}</p>
                )}
              </div>

              {/* ПРАВАЯ КОЛОНКА — все инпуты в одну колонку */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="g-name">Название</Label>
                  <Input
                    id="g-name"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Красная роза"
                  />
                  {fieldErrors.name && (
                    <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="g-slug">Slug (URL)</Label>
                  <Input
                    id="g-slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="red_rose"
                  />
                  {fieldErrors.slug && (
                    <p className="text-xs text-destructive">{fieldErrors.slug[0]}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="g-price">Цена (в ед.)</Label>
                 <Input
                    id="g-price"
                    type="text"
                    inputMode="numeric"
                    value={price}
                    onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                  {fieldErrors.price && (
                    <p className="text-xs text-destructive">{fieldErrors.price[0]}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Категория</Label>
                  {type === "services" ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground italic bg-muted/30 rounded border border-dashed border-border">
                      Для услуг категория не нужна
                    </div>
                  ) : (
                    <Select
                      value={category ?? ""}
                      onValueChange={(v: string | null) => v && setCategory(v as GiftCategoryType)}
                    >
                      <SelectTrigger className="w-full">
                        {CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? "Категория"}
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {fieldErrors.category && (
                    <p className="text-xs text-destructive">{fieldErrors.category[0]}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Тип подарка</Label>
                  <Select
                    value={type}
                    onValueChange={(v: string | null) => v && handleTypeChange(v as GiftTypeType)}
                  >
                    <SelectTrigger className="w-full">
                      {TYPE_OPTIONS.find((o) => o.value === type)?.label ?? "Тип"}
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.type && (
                    <p className="text-xs text-destructive">{fieldErrors.type[0]}</p>
                  )}
                </div>

                {/* Статус — в той же колонке, внизу */}
                <div className="flex items-center gap-3 pt-1">
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) => setIsActive(checked)}
                  />
                  <span className="text-sm font-medium">В продаже</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-muted/20 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Отмена
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {gift ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}