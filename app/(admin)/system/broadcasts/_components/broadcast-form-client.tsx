// app/(admin)/system/broadcasts/_components/broadcast-form-client.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useBroadcastDetail,
  useCreateBroadcast,
  useUpdateBroadcast,
  type BroadcastPayload,
  type BroadcastType,
} from "@/hooks/admin/use-broadcasts";
import type { SearchUserItem } from "@/hooks/admin/use-search-users";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Radio, ChevronRight, Loader2,
  Lock, ListChecks, RotateCcw,
} from "lucide-react";
import { BroadcastContentCard } from "./broadcast-content-card";
import { BroadcastSettingsCard } from "./broadcast-settings-card";
import { BroadcastAudienceCard, MIN_AGE, MAX_AGE } from "./broadcast-audience-card";
import { BroadcastConfirmModal } from "./broadcast-confirm-modal";
import { EMPTY_FILTERS, type AudienceFilters } from "./_shared";

interface BroadcastFormClientProps {
  broadcastId: number | null;
}

export function BroadcastFormClient({ broadcastId }: BroadcastFormClientProps) {
  const router = useRouter();
  const isEdit = broadcastId !== null;

  const { data: existingBroadcast, isLoading } = useBroadcastDetail(broadcastId);
  const createMutation = useCreateBroadcast();
  const updateMutation = useUpdateBroadcast();

  // Form state
  const [title, setTitle] = useState("");
  const [type, setType] = useState<BroadcastType>("in_app");
  const [message, setMessage] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  // Audience state
  const [selectedUser, setSelectedUser] = useState<SearchUserItem | null>(null);
  const [filters, setFilters] = useState<AudienceFilters>({ ...EMPTY_FILTERS });

  // UI state
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load broadcast data (edit mode)
  useEffect(() => {
    if (isEdit && isLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDataLoaded(false);
      return;
    }
    if (isEdit && !existingBroadcast?.data) {
      setIsDataLoaded(false);
      return;
    }
    if (!isEdit) {
      // При создании — гарантированно сбрасываем state.
      setSelectedUser(null);
      setFilters({ ...EMPTY_FILTERS });
      setIsDataLoaded(true);
      return;
    }

    if (existingBroadcast?.data && isEdit) {
      const b = existingBroadcast.data;
      
      setTitle(b.title);
      
      setType(b.type);
      
      setMessage(b.message ?? "");
      
      setEmailBody(b.email_body ?? "");
      
      setActionUrl(b.action_url ?? "");
      
      setScheduledAt(b.scheduled_at ?? "");

      const target = b.target_audience as Record<string, unknown>;
      if (target && target.user_id) {
        // Используем полные данные target_user из API (если есть).
        if (b.target_user) {
          
          setSelectedUser(b.target_user);
        } else {
          // Fallback — юзер удалён из БД.
          
          setSelectedUser({
            id: target.user_id as number,
            name: (target.user_name as string) ?? `ID ${target.user_id}`,
            email: "",
            avatar_url: null,
            status: "active",
            deleted_at: null,
            has_active_premium: false,
            has_active_vip: false,
            is_verified: false,
            is_online: false,
          });
        }
      } else if (target && Object.keys(target).length > 0) {
        const loadedFilters: AudienceFilters = {
          gender: (target.gender as string) ?? null,
          is_premium: target.is_premium === true ? "true" : target.is_premium === false ? "false" : null,
          city_id: (target.city_id as string) ?? null,
          city_label: (target.city_label as string) ?? null,
          age_from: target.age_from ? String(target.age_from) : null,
          age_to: target.age_to ? String(target.age_to) : null,
          last_seen_days: target.last_seen_days ? String(target.last_seen_days) : null,
          has_photo: target.has_photo === true ? "true" : target.has_photo === false ? "false" : null,
        };
        
        setFilters(loadedFilters);
      }
      
      setIsDataLoaded(true);
    }
  }, [existingBroadcast, isEdit, isLoading]);

  const isLocked = isEdit && existingBroadcast?.data
    ? !["draft", "scheduled"].includes(existingBroadcast.data.status)
    : false;

  const handleBodyChange = (html: string) => {
    setEmailBody(html);
  };

  const clearFieldError = (field: string) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: "" } : prev));
  };

  const handleSelectUser = (user: SearchUserItem) => {
    setSelectedUser(user);
    setFilters({ ...EMPTY_FILTERS });
    clearFieldError("selected_user_id");
  };

  const handleClearUser = () => {
    setSelectedUser(null);
  };

  const handleResetSettings = () => {
    setType("in_app");
    setScheduledAt("");
    setSelectedUser(null);
    setFilters({ ...EMPTY_FILTERS });
    setEmailBody("");
    setMessage("");
    setActionUrl("");
    setErrors({});
    toast.info("Настройки и аудитория сброшены");
  };

  const handleFilterChange = (key: keyof AudienceFilters, value: string | null) => {
    setFilters((prev) => ({ ...prev, [key]: value === "" || value === "all" ? null : value }));
  };

  // Build audience summary for confirm modal
  const audienceSummary: string = (() => {
    if (selectedUser) {
      return `Только юзер: ${selectedUser.name} (ID: ${selectedUser.id})`;
    }

    const parts: string[] = [];
    if (filters.gender) parts.push(filters.gender === "male" ? "Мужчины" : "Женщины");
    if (filters.is_premium === "true") parts.push("Только VIP");
    if (filters.is_premium === "false") parts.push("Без VIP");
    if (filters.city_label) parts.push("Город: " + filters.city_label);

    const ageParts: string[] = [];
    if (filters.age_from) ageParts.push("от " + filters.age_from);
    if (filters.age_to) ageParts.push("до " + filters.age_to);
    if (ageParts.length) parts.push("Возраст: " + ageParts.join(" "));

    if (filters.last_seen_days) {
      parts.push("Не заходили >" + filters.last_seen_days + "д");
    }
    if (filters.has_photo === "true") parts.push("С фото");
    if (filters.has_photo === "false") parts.push("Без фото");

    return parts.length === 0 ? "Все пользователи (без фильтров)" : parts.join(", ");
  })();

  /**
   * Валидация формы при submit.
   *
   * Возраст: проверяем 18..99 для age_from и age_to отдельно.
   * Диапазон: from <= to (если оба заполнены).
   */
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!title.trim()) errs.title = "Заголовок обязателен";

    if (type === "email") {
      if (!emailBody.trim()) errs.email_body = "HTML верстка письма обязательна";
    } else {
      if (!message.trim()) errs.message = "Текст сообщения обязателен";
    }

    if (actionUrl && !/^https?:\/\/.+/.test(actionUrl)) {
      errs.action_url = "URL должен начинаться с http:// или https://";
    }

    // Валидация возраста: 18..99.
    if (filters.age_from) {
      const from = parseInt(filters.age_from, 10);
      if (isNaN(from) || from < MIN_AGE || from > MAX_AGE) {
        errs.age_from = `Возраст «от» должен быть от ${MIN_AGE} до ${MAX_AGE}`;
      }
    }
    if (filters.age_to) {
      const to = parseInt(filters.age_to, 10);
      if (isNaN(to) || to < MIN_AGE || to > MAX_AGE) {
        errs.age_to = `Возраст «до» должен быть от ${MIN_AGE} до ${MAX_AGE}`;
      }
    }
    // Диапазон: from <= to. Проверяем только если оба валидны.
    if (!errs.age_from && !errs.age_to && filters.age_from && filters.age_to) {
      const from = parseInt(filters.age_from, 10);
      const to = parseInt(filters.age_to, 10);
      if (from > to) {
        errs.age_from = "Возраст «от» не может быть больше возраста «до»";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleOpenConfirm = () => {
    if (validate()) {
      setShowConfirmModal(true);
    } else {
      toast.error("Ошибка валидации! Проверьте выделенные поля.");
    }
  };

  const handleSave = () => {
    setShowConfirmModal(false);

    const payload: BroadcastPayload = {
      title: title.trim(),
      type,
      message: type === "email" ? undefined : message,
      email_body: type === "email" ? emailBody : undefined,
      action_url: actionUrl.trim() || undefined,
      scheduled_at: scheduledAt || undefined,
      selected_user_id: selectedUser?.id ?? undefined,
      filters: selectedUser ? undefined : {
        gender: filters.gender,
        is_premium: filters.is_premium,
        city_id: filters.city_id || undefined,
        city_label: filters.city_label || undefined,
        age_from: filters.age_from ? parseInt(filters.age_from) : undefined,
        age_to: filters.age_to ? parseInt(filters.age_to) : undefined,
        last_seen_days: filters.last_seen_days ? parseInt(filters.last_seen_days) : undefined,
        has_photo: filters.has_photo,
      },
    };

    if (isEdit && broadcastId !== null) {
      updateMutation.mutate(
        { id: broadcastId, payload },
        {
          onSuccess: () => {
            router.push("/system/broadcasts");
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: (data) => {
          if (data?.data?.id) {
            router.push(`/system/broadcasts/${data.data.id}/edit`);
          } else {
            router.push("/system/broadcasts");
          }
        },
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (!isDataLoaded) {
    return null;
  }

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <button
                onClick={() => router.push("/system/broadcasts")}
                className="hover:text-foreground transition-colors"
              >
                Назад к рассылкам
              </button>
              <ChevronRight className="w-4 h-4" />
              <span>{isEdit ? "Редактирование" : "Создание"}</span>
            </div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Radio className="w-6 h-6" />
              {title || "Новая рассылка"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLocked ? (
            <Badge variant="destructive" className="text-sm py-1 px-3">
              <Lock className="w-4 h-4 mr-1" /> Заблокировано ({existingBroadcast?.data?.status})
            </Badge>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetSettings}
                className="gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                Сбросить
              </Button>
              <Button onClick={handleOpenConfirm} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <ListChecks className="w-4 h-4" />
                    Проверить и сохранить
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 items-stretch lg:grid-cols-3">
        {/* Left column — content */}
        <div className="flex lg:col-span-2">
          <BroadcastContentCard
            title={title}
            type={type}
            message={message}
            emailBody={emailBody}
            actionUrl={actionUrl}
            isLocked={isLocked}
            errors={errors}
            onTitleChange={setTitle}
            onMessageChange={setMessage}
            onEmailBodyChange={handleBodyChange}
            onActionUrlChange={setActionUrl}
            onClearError={clearFieldError}
          />
        </div>

        {/* Right column — settings + audience */}
        <div className="lg:col-span-1 space-y-6">
          <BroadcastSettingsCard
            type={type}
            scheduledAt={scheduledAt}
            isLocked={isLocked}
            onTypeChange={setType}
            onScheduledAtChange={setScheduledAt}
          />

          <BroadcastAudienceCard
            selectedUser={selectedUser}
            filters={filters}
            isLocked={isLocked}
            errors={errors}
            onSelectUser={handleSelectUser}
            onClearUser={handleClearUser}
            onFilterChange={handleFilterChange}
            onClearError={clearFieldError}
          />
        </div>
      </div>

      {/* Confirm Modal */}
      <BroadcastConfirmModal
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        title={title}
        type={type}
        scheduledAt={scheduledAt}
        audienceSummary={audienceSummary}
        isEdit={isEdit}
        isSubmitting={isSubmitting}
        onConfirm={handleSave}
      />
    </div>
  );
}