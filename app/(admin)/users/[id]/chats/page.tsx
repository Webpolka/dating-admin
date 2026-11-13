import { ChatsTab } from "../_components/tabs/chats-tab";

export default async function ChatsTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChatsTab userId={Number(id)} />;
}
