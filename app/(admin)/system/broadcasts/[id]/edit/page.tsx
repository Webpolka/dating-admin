// app/(admin)/system/broadcasts/[id]/edit/page.tsx
import { BroadcastFormClient } from "../../_components/broadcast-form-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBroadcastPage({ params }: PageProps) {
  const { id } = await params;
  const broadcastId = parseInt(id, 10);

  if (isNaN(broadcastId)) {
    return <div className="p-6 text-destructive">Неверный ID рассылки</div>;
  }

  return <BroadcastFormClient broadcastId={broadcastId} />;
}