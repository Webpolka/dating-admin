import { CardsTab } from "../_components/tabs/cards-tab";

export default async function CardsTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CardsTab userId={Number(id)} />;
}
