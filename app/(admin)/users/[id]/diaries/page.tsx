import { DiariesTab } from "../_components/tabs/diaries-tab";

export default async function DiariesTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DiariesTab userId={Number(id)} />;
}
