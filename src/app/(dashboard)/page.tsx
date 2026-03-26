import {
  getInstrumentsWithBiases,
  getUpcomingEconomicEvents,
  getLiveFeedArticles,
} from "@/lib/queries";
import { getMarketSentiment } from "@/lib/sentiment";
import { UpcomingEvents } from "@/components/upcoming-events";
import { MarketSentiment } from "@/components/market-sentiment";
import { HomeFeed } from "@/components/home-feed";
import { BrokerPartners } from "@/components/broker-partners";
import { PollerHealth } from "@/components/poller-health";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [instruments, upcomingEvents, marketSentiment, liveArticles] =
    await Promise.all([
      getInstrumentsWithBiases(),
      getUpcomingEconomicEvents(7),
      getMarketSentiment(),
      getLiveFeedArticles(),
    ]);

  return (
    <>
      <UpcomingEvents events={upcomingEvents} />
      <MarketSentiment sentiment={marketSentiment} />
      <HomeFeed
        instruments={instruments}
        initialArticles={liveArticles}
      />
      <BrokerPartners />
      <PollerHealth />
    </>
  );
}
