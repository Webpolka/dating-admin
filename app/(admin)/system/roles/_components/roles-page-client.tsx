// app/(admin)/system/roles/_components/roles-page-client.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { StaffPromoteCard } from "./staff-promote-card";
import { StaffTable } from "./staff-table";
import { getInitialUrlParam } from "@/lib/url-params";
 
export function RolesPageClient() {
  const router = useRouter();

  // F10: page из URL (после mount, чтобы не было hydration mismatch).
  // Прямой заход на /system/roles?page=2 откроет сразу 2-ю страницу.
  const [page, setPage] = useState(1);
  const [urlInitialized, setUrlInitialized] = useState(false);

  useEffect(() => {
    const urlPage = parseInt(getInitialUrlParam("page") || "1", 10);
       // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isNaN(urlPage) && urlPage > 0) setPage(urlPage);
    setUrlInitialized(true);
  }, []);

  // Колбэк для StaffPromoteCard — после успешного promote сбрасываем
  // на 1-ю страницу (новый сотрудник появится там).
  const handlePromoted = () => {
    setPage(1);
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Заголовок */}
      <div className="flex items-center gap-4">
        {/* F1: router.back() вместо window.history.back() — Next.js корректно
            обрабатывает, не выйдет за пределы админки. */}
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" />
          Роли и Админы
        </h1>
      </div>

      {/* Блок повышения (поиск + dropdown) */}
      <StaffPromoteCard onPromoted={handlePromoted} />

      {/* Таблица текущих сотрудников */}
      <StaffTable
        page={page}
        onPageChange={setPage}
        urlInitialized={urlInitialized}
      />
    </div>
  );
}