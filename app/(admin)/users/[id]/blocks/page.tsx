import { BlocksTab } from "../_components/tabs/blocks-tab";

export default async function BlocksTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BlocksTab userId={Number(id)} />;
}