import { Suspense } from "react";
import { PhotosPageClient } from "./_components/photos-page-client";

export default function PhotosPagePage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Загрузка...</div>}>
      <PhotosPageClient />
    </Suspense>
  );
}