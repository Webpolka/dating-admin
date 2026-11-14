// app/(admin)/system/interests/[id]/edit/page.tsx
import { InterestFormClient } from "../../_components/interest-form-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditInterestPage({ params }: PageProps) {
  const { id } = await params;
  const interestId = parseInt(id, 10);

  if (isNaN(interestId)) {
    return <div className="p-6 text-destructive">Неверный ID интереса</div>;
  }

  return <InterestFormClient interestId={interestId} backUrl="/system/interests" />;
}
