// app/(admin)/system/interests/page.tsx
import { Suspense } from "react";
import { InterestsTableClient } from "./_components/interests-table-client";

export default function InterestsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Загрузка...</div>}>
      <InterestsTableClient />
    </Suspense>
  );
}
