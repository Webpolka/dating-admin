import { DatingTab } from "../_components/tabs/dating-tab";

export default async function DatingTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DatingTab userId={Number(id)} />;
}
