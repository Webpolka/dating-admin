// app/(admin)/system/settings/_components/settings-page-client.tsx
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Info } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Settings as SettingsIcon, Save, RotateCcw,
} from "lucide-react";
import { settingsApi, type SettingItem, type SettingGroup, type SettingValue } from "@/lib/api/settings";
import { extractErrorMessage } from "@/lib/api";
import { getInitialUrlParam } from "@/lib/url-params";
import { getGroupIcon, ucfirst } from "./_shared";
import { SettingRow } from "./setting-row";

export function SettingsPageClient() {
  const queryClient = useQueryClient();
    const [activeGroup, setActiveGroup] = useState('general');
  const [settingsState, setSettingsState] = useState<SettingItem[]>([]);
  const [isResetAlertOpen, setIsResetAlertOpen] = useState(false);
  // Ошибки валидации по id настройки (для красных рамок).
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});
  // Отдельный state для "отображённой" группы — чтобы анимация
  // проигрывалась только когда данные реально обновились.
  const [displayedGroup, setDisplayedGroup] = useState<string | null>(null);
  const [urlInitialized, setUrlInitialized] = useState(false);

  // F5: URL-sync для activeGroup.
  useEffect(() => {
    const urlGroup = getInitialUrlParam("group");
    if (urlGroup) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveGroup(urlGroup);
    }
    setUrlInitialized(true);
  }, []);

  useEffect(() => {
    if (!urlInitialized) return;
    const params = new URLSearchParams();
    if (activeGroup !== "general") params.set("group", activeGroup);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [activeGroup, urlInitialized]);

  const { data: groups } = useQuery({
    queryKey: ['settingGroups'],
    queryFn: settingsApi.getGroups,
  });

  // F2: placeholderData вместо deprecated keepPreviousData.
  const { data: dbSettings, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['settings', activeGroup],
    queryFn: () => settingsApi.getSettings(activeGroup),
    placeholderData: (prev) => prev,
  });

  // Обновляем отображаемые данные ТОЛЬКО когда данные загружены для текущей группы.
  useEffect(() => {
    if (!isFetching && dbSettings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettingsState(dbSettings);      
      setDisplayedGroup(activeGroup);
    }
  }, [dbSettings, isFetching, activeGroup]);

  // F3: extractErrorMessage.
  const saveMutation = useMutation({
    mutationFn: () => settingsApi.save(activeGroup, settingsState),
    onSuccess: () => {
      toast.success('Настройки сохранены!');
      queryClient.invalidateQueries({ queryKey: ['settings', activeGroup] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, 'Ошибка сохранения')),
  });

  const resetMutation = useMutation({
    mutationFn: () => settingsApi.reset(activeGroup),
    onSuccess: () => {
      toast.info('Настройки сброшены!');
      queryClient.invalidateQueries({ queryKey: ['settings', activeGroup] });
      setIsResetAlertOpen(false);
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, 'Ошибка сброса')),
  });

  const handleInputChange = (id: number, value: SettingValue) => {
    setSettingsState(prev => prev.map(s => s.id === id ? { ...s, value } : s));
    // Очищаем ошибку валидации для этого поля.
    setValidationErrors(prev => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Валидация перед save: integer значения не могут быть < 0.
  const validateBeforeSave = (): boolean => {
    const errors: Record<number, string> = {};
    for (const s of settingsState) {
      if (s.type === 'integer') {
        const num = Number(s.value);
        if (s.value === '' || s.value === null || isNaN(num)) {
          errors[s.id] = 'Обязательное поле';
        } else if (num < 0) {
          errors[s.id] = 'Значение не может быть отрицательным';
        }
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const hasChanges = JSON.stringify(dbSettings) !== JSON.stringify(settingsState);

  // Loading states
  const isFirstLoad = isLoading && !dbSettings && displayedGroup === null;
  const isSwitchingGroup = displayedGroup !== activeGroup;
  const showEmpty = !isLoading && !isFetching && settingsState.length === 0 && displayedGroup === activeGroup && !isError;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <SettingsIcon className="w-6 h-6" />
            Настройки системы
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <AlertDialog open={isResetAlertOpen} onOpenChange={setIsResetAlertOpen}>
            <AlertDialogTrigger render={
              <Button variant="destructive" size="sm" className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Сбросить к дефолтным
              </Button>
            }/>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Сброс настроек</AlertDialogTitle>
                <AlertDialogDescription>
                  Сбросить настройки этой группы к значениям по умолчанию? Текущие изменения будут потеряны.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => resetMutation.mutate()}
                  disabled={resetMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {resetMutation.isPending ? "Сброс..." : "Сбросить"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button 
            size="sm" 
            onClick={() => {
              if (!validateBeforeSave()) {
                toast.error('Проверьте выделенные поля');
                return;
              }
              saveMutation.mutate();
            }} 
            disabled={!hasChanges || saveMutation.isPending}
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

      {/* Группы (Вкладки) */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {groups?.map((group: SettingGroup) => {
          const Icon = getGroupIcon(group.key);
          const isActive = activeGroup === group.key;
          return (
            <Button
              key={group.key}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveGroup(group.key)}
              className="gap-2"
            >
              <Icon className="w-4 h-4" />
              {group.label}
            </Button>
          );
        })}
      </div>

      {/* Форма настроек */}
      <Card className="p-6 relative">
        {/* Spinner overlay при переключении группы */}
        {isSwitchingGroup && !isFirstLoad && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-[2px] rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        <div className="space-y-6">
          {/* Заголовок показывает ТЕКУЩУЮ выбранную группу */}
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {groups?.find((g: SettingGroup) => g.key === activeGroup)?.label || ucfirst(activeGroup)}
            <span className="text-xs text-muted-foreground font-normal">
              ({settingsState.length} настроек)
            </span>
          </h2>

          {isFirstLoad ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-destructive">Не удалось загрузить настройки</p>
              <p className="text-xs text-muted-foreground mt-1">
                {extractErrorMessage(error, "Проверьте соединение с сервером")}
              </p>
            </div>
          ) : showEmpty ? (
            <div className="py-12 text-center text-muted-foreground animate-in fade-in duration-300">
              <Info className="w-12 h-12 opacity-30 mx-auto mb-2" />
              <p>В этой группе пока нет настроек</p>
            </div>
          ) : (
            /* key={displayedGroup} — меняется ТОЛЬКО когда данные реально обновились.
               При переключении группы key остаётся старым, overlay spinner поверх,
               когда данные приходят — key меняется → DOM пересоздаётся → каскадная анимация */
            <div key={displayedGroup} className="space-y-4">
              {settingsState.map((setting, idx) => (
                <SettingRow
                  key={setting.id}
                  setting={setting}
                  index={idx}
                  onInputChange={handleInputChange}
                  error={validationErrors[setting.id]}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Подсказка */}
      <div className="text-xs text-muted-foreground p-4 bg-muted/10 rounded-lg border border-border flex items-start gap-2">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Изменения вступают в силу сразу после сохранения. Кэш сбрасывается автоматически.
          Бейдж <span className="text-green-500 font-medium">API</span> означает, что настройка публичная и отдается на фронтенд.
        </span>
      </div>
    </div>
  );
}