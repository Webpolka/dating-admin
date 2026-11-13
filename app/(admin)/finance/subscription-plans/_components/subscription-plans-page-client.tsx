// app/(admin)/finance/subscription-plans/_components/subscription-plans-page-client.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard } from "lucide-react";
import type { PlanTier } from "@/hooks/admin/use-subscription-plans";
import { PlansTab } from "./plans-tab";
 
export function SubscriptionPlansPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Таб читается из URL при первом рендере. Дальше переключение таба
  // пишется в URL внутри PlansTab (он же пишет и q=...).
  const [tab, setTab] = useState<PlanTier>(
    (searchParams.get("tab") as PlanTier) ?? "premium"
  );

  const handleTabChange = (next: PlanTier) => {
    setTab(next);
    // При смене таба сбрасываем query — PlansTab подхватит свой search
    // из URL (он там есть). Если не сбросить — в URL останется ?tab=premium&q=...,
    // а новый таб начнёт с пустым поиском.
    router.replace(`?tab=${next}`, { scroll: false });
  };

  return (
    <div className="space-y-6 p-4 lg:p-6 pb-6">
      {/* Шапка */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            Тарифы и подписки
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Управление планами монетизации</p>
        </div>
      </div>

      {/* Табы */}
      <div className="border-b border-border">
        <nav className="flex gap-x-4 flex-wrap">
          <button
            onClick={() => handleTabChange("premium")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "premium"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Premium
          </button>
          <button
            onClick={() => handleTabChange("vip")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === "vip"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            VIP
          </button>
        </nav>
      </div>

      {/* Контент по табу */}
      <PlansTab tier={tab} />
    </div>
  );
}