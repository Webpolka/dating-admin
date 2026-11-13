// app/(admin)/system/media/page.tsx
import { Suspense } from "react";
import { MediaLibraryPageClient } from "./_components/media-library-page-client";

export default function MediaLibraryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Загрузка...</div>}>
      <MediaLibraryPageClient />
    </Suspense>
  );
}