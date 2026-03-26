import {
  getInstrumentsWithBiases,
  getUpcomingEconomicEvents,
  getRecentArticlesAll,
  getLiveFeedArticles,
} from "@/lib/queries";
import { getMarketSentiment } from "@/lib/sentiment";
import { UpcomingEvents } from "@/components/upcoming-events";
import { MarketSentiment } from "@/components/market-sentiment";
import { HomeFeed } from "@/components/home-feed";
import { BrokerPartners } from "@/components/broker-partners";
import { LiveNewsTicker } from "@/components/live-news-ticker";
import { PollerHealth } from "@/components/poller-health";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [instruments, upcomingEvents, marketSentiment, recentArticles, liveArticles] =
    await Promise.all([
      getInstrumentsWithBiases(),
      getUpcomingEconomicEvents(7),
      getMarketSentiment(),
      getRecentArticlesAll(7, 30),
      getLiveFeedArticles(),
    ]);

  return (
    <>
      <UpcomingEvents events={upcomingEvents} />
      <MarketSentiment sentiment={marketSentiment} />
      <LiveNewsTicker initialArticles={liveArticles} />
      <HomeFeed
        instruments={instruments}
        articles={recentArticles}
      />
      <BrokerPartners />
      <PollerHealth />
    </>
  );
}
