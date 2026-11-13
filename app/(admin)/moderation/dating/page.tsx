import { Suspense } from "react";
import { DatingPageClient } from "./_components/dating-page-client";

export default function DatingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Загрузка...</div>}>
      <DatingPageClient />
    </Suspense>
  );
}