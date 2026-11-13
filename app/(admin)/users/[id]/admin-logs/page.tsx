import { AdminLogsTab } from "../_components/tabs/admin-logs-tab";

export default async function AdminLogsTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminLogsTab userId={Number(id)} />;
}
