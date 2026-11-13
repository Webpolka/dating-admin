import { ReportsTab } from "../_components/tabs/reports-tab";

export default async function ReportsTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReportsTab userId={Number(id)} />;
}