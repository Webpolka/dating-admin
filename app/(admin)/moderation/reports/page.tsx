import { Suspense } from "react";
import { ReportsPageClient } from "./_components/reports-page-client";

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Загрузка...</div>}>
      <ReportsPageClient />
    </Suspense>
  );
}