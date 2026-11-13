// app/(admin)/communication/support-templates/_components/template-editor-client.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useSupportTemplateDetail,
  useSupportCategoriesList,
  useCreateSupportTemplate,
  useUpdateSupportTemplate,
  type TemplateFormData,
} from "@/hooks/admin/use-support-templates";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import {
  ArrowLeft, FileText, Save, Loader2, ChevronRight, Settings,
} from "lucide-react";

interface TemplateEditorClientProps {
  templateId: number | null;
}

export function TemplateEditorClient({ templateId }: TemplateEditorClientProps) {
  const router = useRouter();
  const mode = templateId !== null ? "edit" : "create";

  // Подгружаем список категорий (для select + дефолтной)
  const { data: categoriesData } = useSupportCategoriesList("");
  const categories = useMemo(() => categoriesData?.data ?? [], [categoriesData]);

  // Для редактирования — подгружаем существующий шаблон
  const { data: existingTemplate, isLoading } = useSupportTemplateDetail(templateId, mode === "edit");

  // Локальный стейт формы
  const [formData, setFormData] = useState<TemplateFormData>({
    category_id: 0,
    title: "",
    body: "",
    is_active: true,
    sort_order: 0,
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const createMutation = useCreateSupportTemplate();
  const updateMutation = useUpdateSupportTemplate();
  const isMutating = createMutation.isPending || updateMutation.isPending;

  // Инициализация формы
  useEffect(() => {
    if (mode === "edit") {
      if (!existingTemplate || initialized) return;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        category_id: existingTemplate.category_id ?? categories[0]?.id ?? 0,
        title: existingTemplate.title || "",
        body: existingTemplate.body || "",
        is_active: existingTemplate.is_active ?? true,
        sort_order: existingTemplate.sort_order ?? 0,
      });
      setInitialized(true);
    } else {
      // Режим создания — дефолтные значения
      if (initialized) return;
      setFormData({
        category_id: categories[0]?.id ?? 0,
        title: "",
        body: "",
        is_active: true,
        sort_order: 0,
      });
      setInitialized(true);
    }
  }, [existingTemplate, mode, categories, initialized]);

  const handleBodyChange = useCallback((html: string) => {
    setFormData((prev) => (prev.body === html ? prev : { ...prev, body: html }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category_id || !formData.title.trim() || !formData.body.trim()) return;

    if (mode === "edit" && templateId) {
      updateMutation.mutate(
        { id: templateId, payload: formData },
        { onSuccess: () => router.back() }
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => router.back(),
      });
    }
  };

  // Состояния загрузки
  if (mode === "edit" && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Состояние "не найдено"
  if (mode === "edit" && !existingTemplate && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <FileText className="w-16 h-16 opacity-25 mb-4" />
        <h3 className="text-lg font-medium">Шаблон не найден</h3>
        <Button variant="outline" size="sm" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Назад
        </Button>
      </div>
    );
  }

  // Если ещё ждём categories (режим создания)
  if (mode === "create" && categories.length === 0 && !categoriesData) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 lg:p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/communication/support-templates"
            className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/communication/support-templates" className="hover:text-foreground transition-colors">
                Назад к шаблонам
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span>{mode === "create" ? "Создание" : "Редактирование"}</span>
            </div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              {formData.title || (mode === "edit" ? `Шаблон #${templateId}` : "Новый шаблон")}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:inline-flex gap-2"
          >
            <Settings className="w-4 h-4" />
            {sidebarOpen ? "Скрыть панель" : "Показать панель"}
          </Button>

          <Button
            type="submit"
            size="sm"
            disabled={isMutating || !formData.title.trim() || !formData.body.trim() || !formData.category_id}
            className="gap-2"
          >
            {isMutating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {mode === "edit" ? "Сохранить" : "Создать"}
          </Button>
        </div>
      </div>

      {/* Основная сетка */}
      <div className={`grid grid-cols-1 gap-6 items-stretch ${sidebarOpen ? "lg:grid-cols-3" : "lg:grid-cols-1"}`}>

        {/* ЛЕВАЯ КОЛОНКА — Контент */}
        <div className={sidebarOpen ? "lg:col-span-2" : "lg:col-span-1"}>
          <Card className="p-6 shadow-sm flex flex-col gap-4">
            {/* Название */}
            <div className="flex flex-col gap-2 shrink-0">
              <Label htmlFor="title">Название шаблона (для меню)</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Например: Приветствие"
                required
              />
              <p className="text-xs text-muted-foreground">
                Показывается в выпадающем списке шаблонов в чате поддержки
              </p>
            </div>

            {/* Markdown-редактор */}
            <div className="flex flex-col gap-2 flex-1 min-h-0">
              <Label className="shrink-0">Текст сообщения (Markdown)</Label>
              <MarkdownEditor
                value={formData.body}
                onChange={handleBodyChange}
                placeholder="Введите текст в Markdown. Например: # Заголовок&#10;&#10;**Жирный текст**, списки, ссылки и т.д."
              />
              <p className="text-xs text-muted-foreground">
                Markdown сохраняется как есть. В чате поддержки будет отрендерен с сохранением форматирования.
              </p>
            </div>
          </Card>
        </div>

        {/* ПРАВАЯ КОЛОНКА — Настройки */}
        {sidebarOpen && (
          <div className="lg:col-span-1">
            <Card className="p-6 shadow-sm">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                <Settings className="w-4 h-4" /> Настройки шаблона
              </h3>

              {/* Категория */}
              <div className="flex flex-col gap-2 mb-4">
                <Label className="text-xs">Категория</Label>
                <Select
                  value={String(formData.category_id)}
                  onValueChange={(v: string | null) => v && setFormData({ ...formData, category_id: Number(v) })}
                >
                  <SelectTrigger className="w-full">
                    {categories.find((c) => c.id === formData.category_id)?.name ?? "Выберите категорию"}
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Активность */}
              <div className="flex items-center justify-between p-3 rounded-md border border-border mb-4 bg-muted/30">
                <div className="pr-4">
                  <p className="text-sm font-medium">Активен</p>
                  <p className="text-xs text-muted-foreground">
                    {formData.is_active ? "Виден в чате поддержки" : "Скрыт от админов"}
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              {/* Порядок */}
              <div className="flex flex-col gap-2 mb-4">
                <Label className="text-xs">Порядок сортировки</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                  className="text-sm"
                  min={0}
                />
                <p className="text-xs text-muted-foreground">
                  Меньше значение — выше в списке шаблонов
                </p>
              </div>

              {/* Информация о шаблоне (только в режиме редактирования) */}
              {mode === "edit" && existingTemplate && (
                <div className="text-xs text-muted-foreground space-y-2 border-t border-border pt-4">
                  <p className="font-medium text-foreground mb-2">Информация</p>

                  <div className="flex justify-between">
                    <span>ID:</span>
                    <span className="text-foreground font-mono">#{existingTemplate.id}</span>
                  </div>

                  {existingTemplate.category && (
                    <div className="flex justify-between">
                      <span>Категория:</span>
                      <span className="text-foreground">{existingTemplate.category.name}</span>
                    </div>
                  )}

                  {existingTemplate.created_at && (
                    <div className="flex justify-between">
                      <span>Создан:</span>
                      <span className="text-foreground">
                        {new Date(existingTemplate.created_at).toLocaleDateString("ru-RU")}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Подсказка */}
              <div className="mt-4 p-3 rounded-md bg-blue-500/5 border border-blue-500/20 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-blue-600 dark:text-blue-400">💡 Подсказка</p>
                <p>Шаблон вставляется в поле ввода чата поддержки. Юзеру отправится ровно тот текст, что ты напишешь здесь.</p>
                <p>Можно использовать форматирование: жирный, списки, заголовки, ссылки, изображения.</p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </form>
  );
}
