import { Suspense } from "react";
import { PhotoCommentsPageClient } from "./_components/photo-comments-page-client";

export default function PhotoCommentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Загрузка...</div>}>
      <PhotoCommentsPageClient />
    </Suspense>
  );
}