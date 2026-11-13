import { BroadcastsTab } from "../_components/tabs/broadcasts-tab";

export default async function BroadcastsTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BroadcastsTab userId={Number(id)} />;
}
