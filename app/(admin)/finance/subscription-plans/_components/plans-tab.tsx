// app/(admin)/finance/subscription-plans/_components/plans-tab.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useSubscriptionPlansList,
  useCreatePlan,
  useUpdatePlan,
  useTogglePlanActive,
  type SubscriptionPlanItem,
  type PlanFormData,
  type PlanTier,
} from "@/hooks/admin/use-subscription-plans";
import { extractErrorMessage, extractValidationErrors } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard, Search, X, Loader2, Plus, Pencil, Check, Clock, Tag, AlertCircle, RefreshCw,
} from "lucide-react";
import { SEARCH_DEBOUNCE_MS, PREMIUM_FEATURES, VIP_FEATURES } from "./_shared";
import { PlanModal } from "./plan-modal";

export function PlansTab({ tier }: { tier: PlanTier }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") ?? "");
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  // F5: per-row toggle pending. Если админ быстро кликает toggle на 2 разных
  // планах — оба спиннера крутятся независимо. Раньше на обоих сразу.
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  const highlightRef = useRef<HTMLDivElement>(null);

  // URL-sync: пишем tab + q. Это ЕДИНСТВЕННОЕ место записи URL для этой страницы
  // (раньше дублировалось в PageClient и PlansTab).
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", tier);
    if (search) params.set("q", search);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [tier, search, router]);

  // Debounce поиска (F4: 400ms вместо 1000ms).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, error, refetch } = useSubscriptionPlansList({
    tier,
    q: debouncedSearch,
  });

  const items: SubscriptionPlanItem[] = useMemo(() => data?.data ?? [], [data]);

  const isIdSearch = debouncedSearch !== "" && /^\d+$/.test(debouncedSearch);
  const searchedId = isIdSearch ? parseInt(debouncedSearch, 10) : null;

  // Авто-scroll к найденному по ID тарифу.
  useEffect(() => {
    if (highlightRef.current && searchedId) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [searchedId, items]);

  const createMutation = useCreatePlan();
  const updateMutation = useUpdatePlan();
  const toggleMutation = useTogglePlanActive();
  const isMutating = createMutation.isPending || updateMutation.isPending;

  const features = tier === "premium" ? PREMIUM_FEATURES : VIP_FEATURES;

  const openCreate = () => {
    setEditingPlan(null);
    setShowModal(true);
  };

  const openEdit = (plan: SubscriptionPlanItem) => {
    setEditingPlan(plan);
    setShowModal(true);
  };

  const handleToggle = (planId: number) => {
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.add(planId);
      return next;
    });
    toggleMutation.mutate(planId, {
      onSettled: () => {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(planId);
          return next;
        });
      },
    });
  };

  const handleSave = (formData: PlanFormData, onError: (errors: Record<string, string[]>) => void) => {
    if (editingPlan) {
      updateMutation.mutate(
        { id: editingPlan.id, payload: formData },
        {
          onSuccess: () => setShowModal(false),
          onError: (err: unknown) => {
            const backendErrors = extractValidationErrors(err);
            if (backendErrors) onError(backendErrors);
            else toast.error(extractErrorMessage(err, "Ошибка обновления тарифа"));
          },
        }
      );
    } else {
      createMutation.mutate(
        { ...formData, tier },
        {
          onSuccess: () => setShowModal(false),
          onError: (err: unknown) => {
            const backendErrors = extractValidationErrors(err);
            if (backendErrors) onError(backendErrors);
            else toast.error(extractErrorMessage(err, "Ошибка создания тарифа"));
          },
        }
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Поиск + кнопка */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
        <Input
            type="search"
            placeholder="Поиск по ID или названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Добавить тариф
        </Button>
      </div>

      {/* Плашка с фичами */}
      <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Что входит в тариф {tier === "premium" ? "Premium" : "VIP"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
          {features.map((feat, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-foreground">
              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Карточки тарифов */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        // F6: отдельная ветка ошибки загрузки (раньше показывало "Тарифов пока нет")
        <div className="text-center py-16">
          <AlertCircle className="w-16 h-16 text-destructive/50 mx-auto mb-3" />
          <p className="text-sm font-medium text-destructive">Не удалось загрузить тарифы</p>
          <p className="text-xs text-muted-foreground mt-1">
            {extractErrorMessage(error, "Проверьте соединение с сервером")}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
            <RefreshCw className="w-4 h-4 mr-2" />
            Повторить
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CreditCard className="w-16 h-16 opacity-25 mx-auto mb-3" />
          <p className="text-sm font-medium">Тарифов пока нет</p>
          <p className="text-xs mt-1">Нажмите «Добавить тариф», чтобы создать первый</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((plan) => {
            const isHighlighted = plan.id === searchedId;
            const isThisRowToggling = togglingIds.has(plan.id);
            return (
            <div
                key={plan.id}
                ref={isHighlighted ? highlightRef : undefined}
                className={`bg-card border rounded-xl overflow-hidden flex flex-col shadow-sm transition-all duration-200 ${
                  isHighlighted
                    ? "border-blue-500 ring-2 ring-blue-500/50 scale-[1.02] z-10"
                    : plan.is_active
                      ? "border-border"
                      : "border-destructive/30 opacity-40"
                }`}
              >
                <div className="p-6 flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      <span className="text-xs text-muted-foreground font-mono rounded-sm bg-muted py-0.5 px-1">
                        #{plan.id}
                      </span>
                    </div>
                    <Badge variant={plan.is_active ? "success" : "secondary"} className="text-[10px]">
                      {plan.is_active ? "Активен" : "Скрыт"}
                    </Badge>
                  </div>

                  <div className="flex items-end gap-2 mb-4">
                    <div className="text-3xl font-bold">
                      {plan.price.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₽
                    </div>
                    {plan.old_price && (
                      <div className="text-lg text-muted-foreground line-through mb-1">
                        {plan.old_price.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₽
                      </div>
                    )}
                    <span className="text-sm font-normal text-muted-foreground mb-1">/ {plan.duration_days} дн.</span>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Длительность: {plan.duration_days} дней</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      <span className="font-mono text-xs">{plan.slug}</span>
                    </div>
                  </div>

                  {(plan.apple_product_id || plan.google_product_id) && (
                    <div className="mt-4 pt-4 border-t border-border space-y-1">
                      {plan.apple_product_id && (
                        <p className="text-xs text-muted-foreground">
                          Apple ID: <span className="font-mono">{plan.apple_product_id}</span>
                        </p>
                      )}
                      {plan.google_product_id && (
                        <p className="text-xs text-muted-foreground">
                          Google ID: <span className="font-mono">{plan.google_product_id}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
                  <Button
                    variant={plan.is_active ? "outline" : "success"}
                    size="sm"
                    onClick={() => handleToggle(plan.id)}
                    disabled={isThisRowToggling}
                  >
                    {isThisRowToggling ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : plan.is_active ? "Скрыть" : "Активировать"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(plan)}
                    title="Редактировать"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Модалка */}
      <PlanModal
        open={showModal}
        onOpenChange={setShowModal}
        plan={editingPlan}
        tier={tier}
        onSave={handleSave}
        isLoading={isMutating}
      />
    </div>
  );
}