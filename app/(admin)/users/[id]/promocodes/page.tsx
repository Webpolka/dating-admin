import { PromocodesTab } from "../_components/tabs/promocodes-tab";

export default async function PromocodesTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PromocodesTab userId={Number(id)} />;
}
