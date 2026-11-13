// app/(admin)/system/broadcasts/page.tsx
import { Suspense } from "react";
import { BroadcastsTableClient } from "./_components/broadcasts-table-client";

export default function BroadcastsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Загрузка...</div>}>
      <BroadcastsTableClient />
    </Suspense>
  );
}