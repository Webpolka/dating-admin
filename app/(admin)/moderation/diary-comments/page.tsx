import { Suspense } from "react";
import { DiaryCommentsPageClient } from "./_components/diary-comments-page-client";

export default function DiaryCommentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Загрузка...</div>}>
      <DiaryCommentsPageClient />
    </Suspense>
  );
}