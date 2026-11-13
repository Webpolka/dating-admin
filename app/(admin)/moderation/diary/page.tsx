import { Suspense } from "react";
import { DiariesPageClient } from "./_components/diaries-page-client";

export default function DiariesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Загрузка...</div>}>
      <DiariesPageClient />
    </Suspense>
  );
}