import { getInstrumentsWithBiases, getUpcomingEconomicEvents } from "@/lib/queries";
import { getMarketSentiment } from "@/lib/sentiment";
import { DashboardClient } from "@/components/dashboard-client";
import { UpcomingEvents } from "@/components/upcoming-events";
import { MarketSentiment } from "@/components/market-sentiment";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [instruments, upcomingEvents, marketSentiment] = await Promise.all([
    getInstrumentsWithBiases(),
    getUpcomingEconomicEvents(7),
    getMarketSentiment(),
  ]);

  return (
    <>
      <UpcomingEvents events={upcomingEvents} />
      <MarketSentiment sentiment={marketSentiment} />
      <DashboardClient instruments={instruments} />
    </>
  );
}
