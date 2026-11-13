import { SessionsTab } from "../_components/tabs/sessions-tab";

export default async function SessionsTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SessionsTab userId={Number(id)} />;
}