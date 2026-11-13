import { BansTab } from "../_components/tabs/bans-tab";

export default async function BansTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BansTab userId={Number(id)} />;
}