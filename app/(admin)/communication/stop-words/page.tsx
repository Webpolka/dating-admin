// app/(admin)/communications/stop-words/page.tsx
import { Suspense } from "react";
import { StopWordsTableClient } from "./_components/stop-words-table-client";

export default function FraudAlertsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Загрузка...</div>}>
      <StopWordsTableClient />
    </Suspense>
  );
}