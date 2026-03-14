import {
  getInstrumentsWithBiases,
  getUpcomingEconomicEvents,
  getRecentArticlesAll,
} from "@/lib/queries";
import { getMarketSentiment } from "@/lib/sentiment";
import { UpcomingEvents } from "@/components/upcoming-events";
import { MarketSentiment } from "@/components/market-sentiment";
import { HomeFeed } from "@/components/home-feed";
import { BrokerPartners } from "@/components/broker-partners";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [instruments, upcomingEvents, marketSentiment, recentArticles] =
    await Promise.all([
      getInstrumentsWithBiases(),
      getUpcomingEconomicEvents(7),
      getMarketSentiment(),
      getRecentArticlesAll(7, 30),
    ]);

  return (
    <>
      <UpcomingEvents events={upcomingEvents} />
      <MarketSentiment sentiment={marketSentiment} />
      <HomeFeed
        instruments={instruments}
        articles={recentArticles}
      />
      <BrokerPartners />
    </>
  );
}
