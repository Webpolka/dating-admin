import { DiaryCommentsTab } from "../_components/tabs/diary-comments-tab";

export default async function DiaryCommentsTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DiaryCommentsTab userId={Number(id)} />;
}
