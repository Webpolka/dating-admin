// app/(admin)/finance/gifts/_components/gifts-page-client.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Gift, Package, History } from "lucide-react";
import { CatalogTab } from "./catalog-tab";
import { HistoryTab } from "./history-tab";
import type { Tab } from "./_shared";

export function GiftsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) ?? "catalog");
  // pendingCatalogSearch — когда кликаешь на подарок в истории, он переключается
  // на вкладку "Каталог" и подставляет ID в поиск.
  const [pendingCatalogSearch, setPendingCatalogSearch] = useState<string | null>(null);

   const handleTabChange = (next: Tab) => {
    // Синхронно чистим URL через window.history.replaceState, ДО того как
    // React перемонтирует дочерний компонент (через key). Если использовать
    // только router.replace — useSearchParams в момент mount вернёт старые
    // данные (?q=12), и search сохранится. window.history.replaceState
    // меняет URL мгновенно, и дочерний компонент при mount прочитает чистый
    // URL через window.location.search.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.search = `?tab=${next}`;
      window.history.replaceState(null, "", url.toString());
    }
    router.replace(`?tab=${next}`, { scroll: false });
    setTab(next);
  };

  // Колбэк для клика по подарку в истории → переключение на каталог + поиск по ID
  const handleGiftClick = (giftId: number) => {
    setPendingCatalogSearch(String(giftId));
    // Аналогично handleTabChange — синхронно чистим URL, чтобы CatalogTab
    // при перемонтировании не подхватил старый search из истории.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.search = `?tab=catalog`;
      window.history.replaceState(null, "", url.toString());
    }
    router.replace(`?tab=catalog`, { scroll: false });
    setTab("catalog");
  };

  return (
    <div className="space-y-6 p-4 lg:p-6 pb-6">
      {/* Заголовок */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Gift className="w-6 h-6" />
            Подарки и монетизация
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Управление каталогом и финансовой историей
          </p>
        </div>
      </div>

      {/* Табы */}
      <div className="border-b border-border">
        <nav className="flex gap-4 flex-wrap">
          <button
            onClick={() => handleTabChange("catalog")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              tab === "catalog"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="w-4 h-4" /> Каталог
          </button>
          <button
            onClick={() => handleTabChange("history")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              tab === "history"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="w-4 h-4" /> История дарений
          </button>
        </nav>
      </div>

      {tab === "catalog"
        ? <CatalogTab pendingSearch={pendingCatalogSearch} onPendingSearchConsumed={() => setPendingCatalogSearch(null)} />
        : <HistoryTab onGiftClick={handleGiftClick} />}
    </div>
  );
}