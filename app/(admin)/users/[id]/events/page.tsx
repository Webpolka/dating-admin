import { EventsTab } from "../_components/tabs/events-tab";

export default async function EventsTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EventsTab userId={Number(id)} />;
}
