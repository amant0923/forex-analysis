import { getAuthUser } from "@/lib/api-auth";
import { getTradeWithDetails } from "@/lib/journal-queries";
import { TradeDetail } from "@/components/trade-detail";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return notFound();

  const { id } = await params;
  const trade = await getTradeWithDetails(Number(id), user.id);
  if (!trade) return notFound();

  return <TradeDetail trade={trade} tier={user.tier} />;
}
