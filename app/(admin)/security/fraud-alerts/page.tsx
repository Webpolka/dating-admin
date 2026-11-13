// app/(admin)/security/fraud-alerts/page.tsx
import { Suspense } from "react";
import { FraudAlertsTableClient } from "./_components/fraud-alerts-table-client";

export default function FraudAlertsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Загрузка...</div>}>
      <FraudAlertsTableClient />
    </Suspense>
  );
}