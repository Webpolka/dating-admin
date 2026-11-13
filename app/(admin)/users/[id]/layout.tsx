import { redirect } from "next/navigation";
import { UserDetailClient } from "./_components/user-detail-client";

export default async function UserDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = Number(id);

  if (!Number.isFinite(userId) || userId <= 0) {
    redirect("/users");
  }

  return <UserDetailClient userId={userId}>{children}</UserDetailClient>;
}