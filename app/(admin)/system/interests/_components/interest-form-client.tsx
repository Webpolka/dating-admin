// app/(admin)/system/interests/_components/interest-form-client.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useInterest,
  useCreateInterest,
  useUpdateInterest,
  type InterestPayload,
  type InterestValidationErrors,
} from "@/hooks/admin/use-interests";
import { useInterestCategories } from "@/hooks/admin/use-interest-categories";
import { InterestCategoryModal } from "./interest-category-modal";
import { extractErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import { ArrowLeft, ChevronRight, Save, Loader2, Settings2, Users, AlertCircle } from "lucide-react";
import { formatDateTime } from "@/lib/format";

interface InterestFormClientProps {
  interestId: number | null;
  backUrl: string;
}

export function InterestFormClient({ interestId, backUrl }: InterestFormClientProps) {
  const router = useRouter();
  const isEdit = interestId !== null;

  const { data: existingInterest, isLoading: isInterestLoading, isError: isInterestError, error: interestError } = useInterest(interestId);
  const { data: categoriesData, isLoading: isCategoriesLoading } = useInterestCategories();
  const createMutation = useCreateInterest();
  const updateMutation = useUpdateInterest();

  // Form state
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [searchBoost, setSearchBoost] = useState(0);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [errors, setErrors] = useState<InterestValidationErrors>({});

  // Ждём загрузки данных (интерес + категории).
  useEffect(() => {
    if (isEdit && isInterestLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDataLoaded(false);
      return;
    }
    if (isEdit && !existingInterest?.data) {
      setIsDataLoaded(false);
      return;
    }
    if (isCategoriesLoading || !categoriesData) {
      setIsDataLoaded(false);
      return;
    }

    if (isEdit && existingInterest?.data) {
      const i = existingInterest.data;
      setName(i.name);
      setCategoryId(i.category_id);
      setSearchBoost(i.search_boost);
    }

    setIsDataLoaded(true);
  }, [existingInterest, isEdit, isInterestLoading, isCategoriesLoading, categoriesData]);

  const categories = categoriesData?.data ?? [];

  const clearFieldError = (field: string) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const handleNameChange = (val: string) => {
    setName(val);
    clearFieldError("name");
  };

  const handleCategoryChange = (val: string | null) => {
    // "none" — sentinel для «Без категории» (Radix Select не любит value="").
    if (val === null || val === "none") {
      setCategoryId(null);
    } else {
      setCategoryId(parseInt(val, 10));
    }
    clearFieldError("category_id");
  };

  const handleBoostChange = (val: string) => {
    const n = val === "" ? 0 : parseInt(val, 10);
    setSearchBoost(Number.isNaN(n) ? 0 : n);
    clearFieldError("search_boost");
  };

  const hasError = (field: string): boolean => Boolean(errors[field]);
  const getFieldError = (field: string): string | null => {
    const err = errors[field];
    return err && err.length > 0 ? err[0] : null;
  };

  const handleSave = () => {
    setErrors({});

    const payload: InterestPayload = {
      name: name.trim(),
      category_id: categoryId,
      search_boost: searchBoost,
    };

    const onError = (error: unknown) => {
      const errResponse = error as {
        response?: { data?: { errors?: InterestValidationErrors } };
      };
      const newErrors = errResponse?.response?.data?.errors ?? {};
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
      }
    };

    if (isEdit && interestId !== null) {
      updateMutation.mutate(
        { id: interestId, payload },
        { onError }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: (created) => {
          if (created?.id) {
            router.push(`/system/interests/${created.id}/edit`);
          } else {
            router.push("/system/interests");
          }
        },
        onError,
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Если запрос интереса упал (404 / сеть / бэк не отвечает) — показываем ошибку,
  // а не висим вечно на спиннере. Кнопка «Назад» возвращает к списку.
  if (isEdit && isInterestError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-60px)] gap-4 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Не удалось загрузить интерес</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {extractErrorMessage(interestError, "Проверьте, что интерес существует и бэкенд отвечает")}
          </p>
          {interestError && (
            <p className="text-xs text-muted-foreground/70 font-mono mt-2">
              {interestError instanceof Error ? `GET /admin/interests/${interestId} → ${interestError.message}` : `GET /admin/interests/${interestId} — ошибка`}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={() => router.push(backUrl)}>
          <ArrowLeft className="w-4 h-4" />
          Вернуться к списку
        </Button>
      </div>
    );
  }

  if (!isDataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-60px)]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const categoryLabel = categoryId !== null
    ? categories.find((c) => c.id === categoryId)?.name ?? null
    : "Без категории";

  return (
    <div className="space-y-6 p-4 lg:p-6 pb-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(backUrl)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <button
                onClick={() => router.push("/system/interests")}
                className="hover:text-foreground transition-colors"
              >
                К интересам
              </button>
              <ChevronRight className="w-4 h-4" />
              <span>{isEdit ? "Редактирование" : "Создание"}</span>
            </div>
            <h1 className="text-2xl font-semibold">
              {name || "Новый интерес"}
            </h1>
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Сохранить
            </>
            )}
        </Button>
      </div>

      {/* Form grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-md border border-border bg-card p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Название интереса
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Например: Фотография"
                maxLength={100}
                className={hasError("name") ? "border-destructive ring-destructive" : ""}
                autoFocus={!isEdit}
              />
              {getFieldError("name") && (
                <p className="text-xs text-destructive">{getFieldError("name")}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Уникальное имя. Slug сгенерируется автоматически из названия.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="category_id" className="text-sm font-medium">
                  Категория
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setCategoryModalOpen(true)}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Управление
                </Button>
              </div>
              <Select
                value={categoryId !== null ? String(categoryId) : "none"}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className={`w-full ${hasError("category_id") ? "border-destructive ring-destructive" : ""}`}>
                  {categoryId !== null ? (
                    <span>{categoryLabel}</span>
                  ) : (
                    <span className="text-muted-foreground">Без категории</span>
                  )}
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value="none">Без категории</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} <span className="text-muted-foreground">({c.interests_count})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getFieldError("category_id") && (
                <p className="text-xs text-destructive">{getFieldError("category_id")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="search_boost" className="text-sm font-medium">
                Буст в выдаче
              </Label>
              <Input
                id="search_boost"
                type="number"
                min={0}
                max={65535}
                value={searchBoost}
                onChange={(e) => handleBoostChange(e.target.value)}
                className={`w-32 ${hasError("search_boost") ? "border-destructive ring-destructive" : ""}`}
              />
              {getFieldError("search_boost") && (
                <p className="text-xs text-destructive">{getFieldError("search_boost")}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Число больше нуля поднимает интерес в выдаче поиска. 0 — без буста.
                Сортировка: буст ↓, потом по числу юзеров ↓.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar — meta */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-md border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Информация
            </h3>

            {isEdit && existingInterest?.data && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">ID</span>
                  <span className="font-mono">#{existingInterest.data.id}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Slug</span>
                  <span className="font-mono text-xs truncate max-w-40" title={existingInterest.data.slug}>
                    {existingInterest.data.slug}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Юзеров
                  </span>
                  <span className="tabular-nums font-medium">
                    {existingInterest.data.users_count}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Создан</span>
                  <span className="text-xs tabular-nums">
                    {formatDateTime(existingInterest.data.created_at)}
                  </span>
                </div>
                {existingInterest.data.updated_at !== existingInterest.data.created_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Обновлён</span>
                    <span className="text-xs tabular-nums text-amber-600 dark:text-amber-500">
                      {formatDateTime(existingInterest.data.updated_at)}
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                  Счётчик юзеров обновляется автоматически при выборе/удалении
                  интереса юзерами.
                </p>
              </>
            )}

            {!isEdit && (
              <p className="text-xs text-muted-foreground">
                После создания интерес появится в списке, и юзеры смогут
                выбирать его в профиле.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Category modal */}
      <InterestCategoryModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        selectedId={categoryId}
        onSelect={(id) => setCategoryId(id)}
      />
    </div>
  );
}
