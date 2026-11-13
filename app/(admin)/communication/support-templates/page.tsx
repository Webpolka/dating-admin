// app/(admin)/communications/support-templates/page.tsx
import { Suspense } from "react";
import { SupportTemplatesPageClient } from "./_components/support-templates-page-client";

export default function AdminLogPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Загрузка...</div>}>
      <SupportTemplatesPageClient />
    </Suspense>
  );
}