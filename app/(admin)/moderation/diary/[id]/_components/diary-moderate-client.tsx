// app/(admin)/moderation/diary/[id]/_components/diary-moderate-client.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  useDiaryDetail,
  useApproveDiary,
  useRejectDiary,
  useUnpublishDiary,
  useUpdateDiarySettings,
  DIARY_REJECT_REASONS,
} from "@/hooks/admin/use-diaries";
import { UserBadge } from "@/components/admin/user-badge";
import type { UserBadgeData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectGroup, SelectLabel,
} from "@/components/ui/select";
import {
  ArrowLeft, Loader2, Save, Check, X, EyeOff, Shield, Clock, CheckCircle, XCircle,
  Calendar, Eye, MessageSquare, Heart, Globe, User as UserIcon,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/format";

// Sentinel value для «Без рубрики» — shadcn Select не работает с value=""
// (пустая строка интерпретируется как «нет значения»). Используем маркер.
const NONE_VALUE = "__none__";

export function DiaryModerateClient({ diaryId }: { diaryId: number }) {
  const router = useRouter();
  const { data, isLoading } = useDiaryDetail(diaryId, !!diaryId);
  const tx = data?.data;
  const availableRubrics = data?.available_rubrics ?? [];

  const [rubricId, setRubricId] = useState<string>(NONE_VALUE);
  const [isCommentsEnabled, setIsCommentsEnabled] = useState(true);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectUI, setShowRejectUI] = useState(false);

  const approveMutation = useApproveDiary();
  const rejectMutation = useRejectDiary();
  const unpublishMutation = useUnpublishDiary();
  const settingsMutation = useUpdateDiarySettings();

  // Безопасная инициализация стейта через useEffect
  useEffect(() => {
    if (tx) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRubricId(tx.diary_rubric ? String(tx.diary_rubric.id) : NONE_VALUE);      
      setIsCommentsEnabled(tx.is_comments_enabled);
    }
  }, [tx]);

  if (isLoading || !tx) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // isPending объединяет все mutations — кнопки disabled пока любой запрос в полёте.
  // Это предотвращает double-submit (случайный дабл-клик).
  const isPending = approveMutation.isPending || rejectMutation.isPending || unpublishMutation.isPending || settingsMutation.isPending;
  const status = tx.status;

  // Settings dirty check — показываем «Сохранить настройки» только если что-то изменено
  const rubricDirty = rubricId !== (tx.diary_rubric ? String(tx.diary_rubric.id) : NONE_VALUE);
  const commentsDirty = isCommentsEnabled !== tx.is_comments_enabled;
  const settingsDirty = rubricDirty || commentsDirty;

  const handleSaveSettings = () => {
    settingsMutation.mutate({
      id: tx.id,
      diary_rubric_id: rubricId === NONE_VALUE ? null : Number(rubricId),
      is_comments_enabled: isCommentsEnabled,
    });
  };

  const handleApprove = () => {
    approveMutation.mutate({
      id: tx.id,
      diary_rubric_id: rubricId === NONE_VALUE ? null : Number(rubricId),
      is_comments_enabled: isCommentsEnabled,
    }, { onSuccess: () => setShowRejectUI(false) });
  };

  const handleConfirmReject = () => {
    rejectMutation.mutate({
      id: tx.id,
      reason: rejectReason,
      diary_rubric_id: rubricId === NONE_VALUE ? null : Number(rubricId),
      is_comments_enabled: isCommentsEnabled,
    }, { onSuccess: () => setShowRejectUI(false) });
  };

  const handleUnpublish = () => {
    unpublishMutation.mutate({
      id: tx.id,
      diary_rubric_id: rubricId === NONE_VALUE ? null : Number(rubricId),
      is_comments_enabled: isCommentsEnabled,
    });  
  };

  // Логика для триггера Select рубрики: показываем иконку Globe/User в зависимости
  // от типа выбранной рубрики. Если «Без рубрики» — Globe (системное состояние).
  const selectedRubric = rubricId !== NONE_VALUE && rubricId
    ? availableRubrics.find(r => String(r.id) === rubricId)
    : null;
  const triggerIcon = selectedRubric?.is_personal ? "personal" : "system";
  const isRubricActive = selectedRubric ? selectedRubric.is_active : true;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Шапка */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()} disabled={isPending}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <button onClick={() => router.push("/moderation/diary")} className="hover:text-foreground">Дневники</button>
              <span>/</span>
              <span>Просмотр и модерация</span>
            </div>
            <h1 className="text-2xl font-semibold flex items-center gap-2 mt-1 wrap-break-words">
              {tx.title}
            </h1>

            {/* Даты + статистика — обычные HTML title на каждом span */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground tabular-nums">
              <span className="inline-flex items-center gap-1" title="Создано">
                <Calendar className="w-3 h-3" />
                {tx.created_at ? formatDateTime(tx.created_at) : "—"}
              </span>
              {tx.updated_at && tx.updated_at !== tx.created_at && (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-500" title="Последнее обновление">
                  <Shield className="w-3 h-3" />
                  ↻ {formatDateTime(tx.updated_at)}
                </span>
              )}
              {tx.published_at && (
                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-500" title="Опубликовано">
                  <CheckCircle className="w-3 h-3" />
                  {formatDate(tx.published_at)}
                </span>
              )}
              <span className="inline-flex items-center gap-1" title="Просмотры">
                <Eye className="w-3 h-3" />
                {tx.views_count}
              </span>
              <span className="inline-flex items-center gap-1" title="Комментарии">
                <MessageSquare className="w-3 h-3" />
                {tx.comments_count}
              </span>
              <span className="inline-flex items-center gap-1" title="Лайки">
                <Heart className="w-3 h-3" />
                {tx.likes_count}
              </span>
            </div>
          </div>
        </div>

        {/* Кнопка сохранения настроек — disabled если нет изменений или pending */}
        <Button
          variant="default"
          size="sm"
          onClick={handleSaveSettings}
          disabled={isPending || !settingsDirty}
          title={settingsDirty ? "Есть несохранённые изменения" : "Нет изменений"}
        >
          {settingsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Сохранить настройки
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ЛЕВАЯ КОЛОНКА (Текст поста) */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm flex flex-col gap-4 h-full">
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 p-4 bg-background rounded-md border border-border/50 overflow-y-auto min-h-[calc(100vh-15rem)] little-scroll whitespace-pre-wrap wrap-break-words" dangerouslySetInnerHTML={{ __html: tx.body || "" }} />
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА (Панель модерации) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm sticky top-4 space-y-5">

            {/* Карточка автора */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md border border-border">
              {tx.user ? (
                <button onClick={() => router.push(`/admin/users/${tx.user?.id}`)} className="block text-left">
                  <UserBadge user={tx.user as unknown as UserBadgeData} size="md" showEmail={true} />
                </button>
              ) : (
                <span className="text-sm text-muted-foreground">Пользователь удален</span>
              )}
            </div>

            {/* Блок настроек (Рубрика / Комменты) */}
            <div className="border-t border-border pt-5 space-y-4">
              <div className="flex flex-col gap-2">
                <Label>Рубрика дневника</Label>
                {/*
                  Select рубрик с группировкой на «Системные (общие)» и «Личные автора».
                  Личные рубрики — это приватные ярлыки автора поста, админ может
                  привязать пост к личной рубрике автора (но не к чужой личной).
                  Бэк отдаёт available_rubrics уже отфильтрованными: только системные
                  + личные текущего автора — без чужих личных.

                  Триггер показывает выбранную рубрику С иконкой типа:
                  - 🌐 Globe (синяя) — для системной или «Без рубрики»
                  - 👤 User (фиолетовая) — для личной автора
                  Чтобы админ сразу видел чья рубрика выбрана, не открывая Select.
                */}
                <Select value={rubricId} onValueChange={(v) => setRubricId(v ?? NONE_VALUE)}>
                  <SelectTrigger className="w-full">
                    <span className={`flex items-center gap-1.5 ${!isRubricActive ? "text-muted-foreground" : ""}`}>
                      {triggerIcon === "personal" ? (
                        <UserIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      )}                      
                      <span className="truncate">
                        {selectedRubric ? selectedRubric.name : "Без рубрики"}
                      </span>
                      {!isRubricActive && <EyeOff className="w-3.5 h-3.5 shrink-0" />}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>
                      <span className="flex items-center gap-1.5 pl-5">                       
                        Без рубрики
                      </span>
                    </SelectItem>

                    <SelectGroup>
                      <SelectLabel className="text-xs text-blue-500 flex items-center gap-1.5 px-1.5 py-1">
                        <Globe className="w-3.5 h-3.5" />
                        Системные рубрики
                      </SelectLabel>
                      {availableRubrics
                        .filter(r => !r.is_personal)
                        .map(r => (
                          <SelectItem
                            key={r.id}
                            value={String(r.id)}
                            disabled={!r.is_active}
                            className="pl-6"
                          >
                            <span className="flex items-center gap-1.5">                              
                              {r.name}
                              {!r.is_active && <EyeOff className="w-3 h-3 text-muted-foreground" />}
                            </span>
                          </SelectItem>
                        ))
                      }
                    </SelectGroup>

                    {availableRubrics.filter(r => r.is_personal).length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="text-xs text-purple-600 flex items-center gap-1.5 px-1.5 py-1">
                          <UserIcon className="w-3.5 h-3.5" />
                          Личные рубрики автора
                        </SelectLabel>
                        {availableRubrics
                          .filter(r => r.is_personal)
                          .map(r => (
                            <SelectItem
                              key={r.id}
                              value={String(r.id)}
                              disabled={!r.is_active}
                              className="pl-6"
                            >
                              <span className="flex items-center gap-1.5">                                
                                {r.name}
                                {!r.is_active && <EyeOff className="w-3 h-3 text-muted-foreground" />}
                              </span>
                            </SelectItem>
                          ))
                        }
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
                {rubricDirty && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-500">● не сохранено</p>
                )}
              </div>

              {/* Switch «Комментарии» — готовый компонент из components/ui/switch.tsx.
                  Раньше был кастомный peer-checkbox со сложным CSS, теперь стили
                  консистентны со всем проектом. */}
              <div className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/30">
                <div className="pr-4">
                  <p className="text-sm font-medium">Комментарии</p>
                  <p className="text-xs text-muted-foreground">{isCommentsEnabled ? "Разрешены" : "Запрещены"}</p>
                </div>
                <Switch
                  checked={isCommentsEnabled}
                  onCheckedChange={setIsCommentsEnabled}
                  disabled={isPending}
                />
              </div>
              {commentsDirty && (
                <p className="text-xs text-yellow-600 dark:text-yellow-500 -mt-2">● не сохранено</p>
              )}
            </div>

            {/* ПАНЕЛЬ МОДЕРАЦИИ */}
            <div className="border-t border-border pt-5">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                <Shield className="w-4 h-4" /> Модерация
              </h3>

              {status === "published" && !showRejectUI && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 text-green-500 rounded-md font-medium">
                    <CheckCircle className="w-5 h-5" /> Запись опубликована
                  </div>
                  {/*
                    Кнопка «Снять с публикации» — возвращает пост в очередь модерации (pending).
                    Это НЕ destructive — пост не удаляется, автору уходит notification,
                    всегда можно снова опубликовать. ConfirmDialog не нужен.
                    Switch здесь был запутанным (исчезал после клика) — кнопка понятнее.
                  */}
                  <Button variant="warning" size="sm" className="w-full" onClick={handleUnpublish} disabled={isPending}>
                    {unpublishMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                    Снять с публикации
                  </Button>
                </div>
              )}

              {status === "rejected" && !showRejectUI && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md font-medium">
                    <XCircle className="w-5 h-5" /> Запись отклонена
                  </div>
                  {tx.reject_reason && (
                    <div className="text-xs text-muted-foreground text-center">
                      Причина: <span className="font-medium text-foreground">
                        {DIARY_REJECT_REASONS.find(r => r.value === tx.reject_reason)?.label ?? tx.reject_reason}
                      </span>
                    </div>
                  )}
                  <Button variant="success" size="sm" className="w-full" onClick={handleApprove} disabled={isPending}>
                    {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                    Одобрить
                  </Button>
                </div>
              )}

              {showRejectUI ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md font-medium">
                    <Shield className="w-5 h-5" /> Выберите причину
                  </div>

                  <div className="flex flex-col gap-2">
                    <Select value={rejectReason} onValueChange={(v) => setRejectReason(v ?? "")}>
                      <SelectTrigger className="w-full"><span className="text-muted-foreground">Выберите причину...</span></SelectTrigger>
                      <SelectContent>
                        {DIARY_REJECT_REASONS.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setShowRejectUI(false)}>Отмена</Button>
                    <Button variant="destructive" size="sm" className="w-full" onClick={handleConfirmReject} disabled={isPending || !rejectReason}>
                      {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                      Подтвердить
                    </Button>
                  </div>
                </div>
              ) : (
                (status === "pending" || status === "draft") && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-center gap-2 p-3 bg-yellow-500/10 text-yellow-500 rounded-md font-medium">
                      <Clock className="w-5 h-5" /> Ожидает модерации
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="success" size="sm" className="w-full" onClick={handleApprove} disabled={isPending}>
                        {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                        Одобрить
                      </Button>

                      <Button variant="destructive" size="sm" className="w-full" onClick={() => setShowRejectUI(true)} disabled={isPending}>
                        <X className="w-4 h-4 mr-2" /> Отклонить
                      </Button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
