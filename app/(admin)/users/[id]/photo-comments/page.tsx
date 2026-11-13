import { PhotoCommentsTab } from "../_components/tabs/photo-comments-tab";

export default async function PhotoCommentsTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PhotoCommentsTab userId={Number(id)} />;
}
