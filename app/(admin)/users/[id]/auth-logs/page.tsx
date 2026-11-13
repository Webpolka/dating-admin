import { AuthLogsTab } from "../_components/tabs/auth-logs-tab";

export default async function AuthLogsTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AuthLogsTab userId={Number(id)} />;
}
