// app/(admin)/finance/transactions/page.tsx
import { Suspense } from "react";
import { TransactionsPageClient } from "./_components/transactions-page-client";

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Загрузка...</div>}>
      <TransactionsPageClient />
    </Suspense>
  );
}