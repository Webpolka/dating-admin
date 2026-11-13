// app/(admin)/moderation/diary/[id]/page.tsx
import { Suspense } from "react";
import { DiaryModerateClient } from "./_components/diary-moderate-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DiaryModeratePage({ params }: PageProps) {
  const { id } = await params;
  const diaryId = parseInt(id, 10);

  if (isNaN(diaryId)) {
    return <div className="p-6 text-destructive">Неверный ID записи</div>;
  }

  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Загрузка...</div>}>
      <DiaryModerateClient diaryId={diaryId} />
    </Suspense>
  );
}