// app/(admin)/system/admin-log/page.tsx
import { Suspense } from "react";
import { AdminLogTableClient } from "./_components/admin-log-table-client";

export default function AdminLogPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Загрузка...</div>}>
      <AdminLogTableClient />
    </Suspense>
  );
}