// app/(admin)/users/[id]/profile/page.tsx

import { Suspense } from "react";
import { ProfileTab } from "../_components/tabs/profile-tab";
import { Loader } from "@/components/ui/loader";

export default async function ProfileTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = Number(id);

  return (
  <Suspense fallback={<Loader className="min-h-[calc(100vh-60px)] w-full" />}>
       <ProfileTab userId={userId} />
  </Suspense>
);
}