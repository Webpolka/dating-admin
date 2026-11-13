import { FinancesTab } from "../_components/tabs/finances-tab";

export default async function FinancesTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FinancesTab userId={Number(id)} />;
}
