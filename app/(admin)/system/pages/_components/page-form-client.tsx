// app/(admin)/system/pages/_components/page-form-client.tsx
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, FileText, Save, Loader2, ChevronRight, Settings,
} from "lucide-react";
import { pagesApi, type PageFormData } from "@/lib/api/pages";
import { extractErrorMessage, extractValidationErrors } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { PostEditor } from "@/components/admin/post-editor";
import type { PageValidationErrors } from "./_shared";

interface PageFormClientProps {
  mode: "create" | "edit";
  pageId?: number;
}

export function PageFormClient({ mode, pageId }: PageFormClientProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<PageFormData>({
    title: "",
    meta_title: "",
    slug: "",
    body: "",
    meta_description: "",
    is_active: false,
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [metaTitleTouched, setMetaTitleTouched] = useState(false);
  const [errors, setErrors] = useState<PageValidationErrors>({});
  // Гард: форма (и PostEditor) НЕ рендерятся, пока данные не загружены.
  // Это prevents PostEditor от инициализации с пустым value="".
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['page', pageId],
    queryFn: () => pagesApi.getPage(pageId!),
    enabled: mode === "edit" && !!pageId,
  });

  // Загрузка данных (edit mode) или сброс (create mode).
  useEffect(() => {
    if (mode === "create") {
      // При создании — гарантированно сбрасываем state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        title: "",
        meta_title: "",
        slug: "",
        body: "",
        meta_description: "",
        is_active: false,
      });
      setMetaTitleTouched(false);
      setErrors({});
      setIsDataLoaded(true);
      return;
    }

    // Edit mode: ждём пока pageData загрузится.
    if (mode === "edit" && isLoading) {
      setIsDataLoaded(false);
      return;
    }
    if (mode === "edit" && !pageData) {
      setIsDataLoaded(false);
      return;
    }

    if (mode === "edit" && pageData) {
      
      setFormData({
        title: pageData.title || "",
        meta_title: pageData.meta_title || "",
        slug: pageData.slug || "",
        body: pageData.body || "",
        meta_description: pageData.meta_description || "",
        is_active: pageData.is_active || false,
      });
      
      setMetaTitleTouched(Boolean(pageData.meta_title));
      
      setErrors({});
      
      setIsDataLoaded(true);
    }
  }, [pageData, mode, isLoading]);

  // Реактивный Meta Title: автозаполняем из title, если юзер не трогал meta_title.
  const handleTitleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      title: value,
      meta_title: metaTitleTouched ? prev.meta_title : value,
    }));
    clearFieldError("title");
  };

  const handleMetaTitleChange = (value: string) => {
    setMetaTitleTouched(true);
    setFormData(prev => ({ ...prev, meta_title: value }));
    clearFieldError("meta_title");
  };

  const handleSlugChange = (value: string) => {
    setFormData(prev => ({ ...prev, slug: value }));
    clearFieldError("slug");
  };

  const handleBodyChange = (html: string) => {
    setFormData(prev => ({ ...prev, body: html }));
    clearFieldError("body");
  };

  const handleMetaDescriptionChange = (value: string) => {
    setFormData(prev => ({ ...prev, meta_description: value }));
    clearFieldError("meta_description");
  };

  const clearFieldError = (field: string) => {
    setErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const hasError = (field: string): boolean => Boolean(errors[field]);
  const getFieldError = (field: string): string | null => {
    const err = errors[field];
    return err && err.length > 0 ? err[0] : null;
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      if (mode === "create") {
        return pagesApi.create(formData);
      } else {
        return pagesApi.update(pageId!, formData);
      }
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setErrors({});
      // Реактивное обновление body из ответа сервера — Purifier мог
      // вырезать <script> и другие запрещённые теги.
      if (data.body !== undefined) {
        setFormData(prev => ({ ...prev, body: data.body }));
      }
      if (mode === "create" && data.page) {
        router.push(`/system/pages/${data.page.id}/edit`);
      }
    },
    onError: (error: unknown) => {
      const backendErrors = extractValidationErrors(error);
      if (backendErrors) {
        setErrors(backendErrors);
        toast.error("Проверьте выделенные поля");
      } else {
        toast.error(extractErrorMessage(error, "Ошибка при сохранении"));
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  // Полноэкранный спиннер, пока данные грузятся.
  // Форма (и PostEditor) НЕ рендерятся, пока isDataLoaded = false.
  // Это prevents PostEditor от инициализации с пустым value="".
  if (!isDataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-60px)]">
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
            href="/system/pages"
            className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/system/pages" className="hover:text-foreground transition-colors">
                Назад к страницам
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span>{mode === "create" ? "Создание" : "Редактирование"}</span>
            </div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              {formData.title || "Новая страница"}
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
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Сохранить
          </Button>
        </div>
      </div>

      {/* Основная сетка */}
      <div className={`grid grid-cols-1 gap-6 items-stretch ${sidebarOpen ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>

        {/* ЛЕВАЯ КОЛОНКА (Контент) */}
        <div className={sidebarOpen ? 'lg:col-span-2' : 'lg:col-span-1'}>
          <Card className="p-6 shadow-sm flex flex-col gap-4">
            {/* Заголовок H1 */}
            <div className="flex flex-col gap-2 shrink-0">
              <Label htmlFor="title">Заголовок страницы (H1)</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Например: Политика конфиденциальности"
                className={hasError("title") ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {getFieldError("title") && (
                <p className="text-xs text-destructive">{getFieldError("title")}</p>
              )}
            </div>

            {/* WYSIWYG Редактор — PostEditor (общий с блогом) */}
            <div className="flex flex-col gap-2 flex-1 min-h-0">
              <Label className="shrink-0">Контент страницы</Label>
              <div className={hasError("body") ? "rounded-lg ring-2 ring-destructive" : ""}>
                <PostEditor
                  value={formData.body}
                  onChange={handleBodyChange}
                  placeholder="Начните писать контент страницы..."
                  containerClassName="border border-border rounded-lg overflow-hidden flex flex-col min-h-120"
                />
              </div>
              {getFieldError("body") && (
                <p className="text-xs text-destructive">{getFieldError("body")}</p>
              )}
            </div>
          </Card>
        </div>

        {/* ПРАВАЯ КОЛОНКА (Настройки + SEO в одной карточке) */}
        {sidebarOpen && (
          <div className="lg:col-span-1">
            <Card className="p-6 shadow-sm">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                <Settings className="w-4 h-4" /> Настройки и SEO
              </h3>

              {/* Slug */}
              <div className="flex flex-col gap-2 mb-4">
                <Label htmlFor="slug" className="text-xs">Slug (URL)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="url-stranitsy"
                  className={`text-sm ${hasError("slug") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {getFieldError("slug") ? (
                  <p className="text-xs text-destructive">{getFieldError("slug")}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    URL: /{formData.slug || 'url-stranitsy'}
                  </p>
                )}
              </div>

              {/* Статус */}
              <div className="flex items-center justify-between p-3 rounded-md border border-border mb-4 bg-muted/30">
                <div className="pr-4">
                  <p className="text-sm font-medium">Доступность страницы</p>
                  <p className="text-xs text-muted-foreground">
                    {formData.is_active ? 'Опубликовано (видна всем)' : 'Скрыто (недоступна)'}
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              {/* Meta Title */}
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex justify-between items-center">
                  <Label htmlFor="meta_title" className="text-xs">Meta Title</Label>
                  <span className={`text-xs ${(formData.meta_title || '').length > 60 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                    {(formData.meta_title || '').length} / 60
                  </span>
                </div>
                <Input
                  id="meta_title"
                  value={formData.meta_title}
                  onChange={(e) => handleMetaTitleChange(e.target.value)}
                  placeholder="SEO заголовок для поисковиков"
                  className={`text-sm ${hasError("meta_title") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {getFieldError("meta_title") && (
                  <p className="text-xs text-destructive">{getFieldError("meta_title")}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {metaTitleTouched
                    ? "Ручной режим"
                    : "Автозаполняется из H1, пока не введёте своё значение"}
                </p>
              </div>

              {/* Meta Description */}
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex justify-between items-center">
                  <Label htmlFor="meta_description" className="text-xs">Meta Description</Label>
                  <span className={`text-xs ${(formData.meta_description || '').length > 160 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                    {(formData.meta_description || '').length} / 160
                  </span>
                </div>
                <textarea
                  id="meta_description"
                  value={formData.meta_description}
                  onChange={(e) => handleMetaDescriptionChange(e.target.value)}
                  rows={3}
                  placeholder="Краткое описание (до 160 символов)"
                  className={`flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none ${hasError("meta_description") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {getFieldError("meta_description") && (
                  <p className="text-xs text-destructive">{getFieldError("meta_description")}</p>
                )}
              </div>

              {/* Даты (edit mode) */}
              {mode === "edit" && pageData && (
                <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-4">
                  {pageData.created_at && (
                    <div className="flex justify-between">
                      <span>Создано:</span>
                      <span className="text-foreground">{formatDateTime(pageData.created_at)}</span>
                    </div>
                  )}
                  {pageData.updated_at && (
                    <div className="flex justify-between">
                      <span>Изменено:</span>
                      <span className="text-foreground">{formatDateTime(pageData.updated_at)}</span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </form>
  );
}