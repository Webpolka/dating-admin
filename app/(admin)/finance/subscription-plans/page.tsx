// app/(admin)/finance/subscription-plans/page.tsx
import { Suspense } from "react";
import { SubscriptionPlansPageClient } from "./_components/subscription-plans-page-client";

export default function SubscriptionPlansPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Загрузка...</div>}>
      <SubscriptionPlansPageClient />
    </Suspense>
  );
}