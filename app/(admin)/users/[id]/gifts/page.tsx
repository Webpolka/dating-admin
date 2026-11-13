import { GiftsTab } from "../_components/tabs/gifts-tab";

export default async function GiftsTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GiftsTab userId={Number(id)} />;
}
