import { PhotosTab } from "../_components/tabs/photos-tab";

export default async function PhotosTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PhotosTab userId={Number(id)} />;
}
