"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Folder } from "lucide-react";
import { getInitialUrlParam } from "@/lib/url-params";
import { TemplatesTab } from "./templates-tab";
import { CategoriesTab } from "./categories-tab";
import type { Tab } from "./_shared";

export function SupportTemplatesPageClient() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("templates");
  const [urlInitialized, setUrlInitialized] = useState(false);

  useEffect(() => {
    const urlTab = getInitialUrlParam("tab") as Tab;
    if (urlTab && ["templates", "categories"].includes(urlTab)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab(urlTab);
    }
    setUrlInitialized(true);
  }, []);

  useEffect(() => {
    if (!urlInitialized) return;
    const params = new URLSearchParams();
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [tab, router, urlInitialized]);

  const handleTabChange = (next: Tab) => {
    setTab(next);
    router.replace(`?tab=${next}`, { scroll: false });
  };

  return (
    <div className="space-y-6 p-4 lg:p-6 pb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Шаблоны поддержки
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Управление шаблонами и категориями для вставки в чат поддержки
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-x-4 flex-wrap border-b border-border">
        <button
          onClick={() => handleTabChange("templates")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === "templates" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="w-4 h-4 inline mr-1" /> Шаблоны
        </button>
        <button
          onClick={() => handleTabChange("categories")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === "categories" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Folder className="w-4 h-4 inline mr-1" /> Категории
        </button>
      </div>

      {tab === "templates" ? <TemplatesTab /> : <CategoriesTab />}
    </div>
  );
}