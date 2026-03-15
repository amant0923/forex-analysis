import { getAuthUser } from "@/lib/api-auth";
import { getInstruments } from "@/lib/queries";
import { getTierLimits } from "@/lib/tier-limits";
import { getAllCommunityBias, getUserVotes, getLeaderboard, getCommunitySettings } from "@/lib/community-queries";
import { CommunityBiasCard } from "@/components/community-bias-card";
import { LeaderboardTable } from "@/components/leaderboard-table";
import type { CommunityBias } from "@/types";

const INSTRUMENTS = [
  "DXY", "EURUSD", "GBPUSD", "USDJPY", "EURJPY",
  "GBPJPY", "EURGBP", "XAUUSD", "XAGUSD", "GER40",
  "US30", "NAS100", "SP500",
];

const TIMEFRAME = "1week";

export default async function CommunityPage() {
  const user = await getAuthUser();
  const limits = user ? getTierLimits(user.tier) : null;
  const canVote = limits?.can_vote_community ?? false;

  const [allBias, userVotes, leaderboard, instruments] = await Promise.all([
    getAllCommunityBias(TIMEFRAME),
    user && canVote ? getUserVotes(user.id) : Promise.resolve([]),
    getLeaderboard(),
    getInstruments(),
  ]);

  // Build a map of community bias by instrument
  const biasMap: Record<string, CommunityBias> = {};
  for (const b of allBias) {
    biasMap[b.instrument] = b;
  }

  // Build user vote map
  const voteMap: Record<string, string> = {};
  for (const v of userVotes) {
    if (v.timeframe === TIMEFRAME) {
      voteMap[v.instrument] = v.direction;
    }
  }

  // Get user display name for highlighting on leaderboard
  let currentUserDisplayName: string | null = null;
  if (user) {
    const settings = await getCommunitySettings(user.id);
    currentUserDisplayName = settings.display_name;
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="text-center space-y-3 pt-4">
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white">Community</h1>
        <p className="text-lg text-white/50 max-w-2xl mx-auto">
          See where the community stands on each instrument. Cast your vote and track how your bias compares to fellow traders.
        </p>
      </div>

      {/* Community Bias Section */}
      <section>
        <h2 className="text-2xl font-serif font-bold text-white mb-4">Community Bias</h2>
        <p className="text-sm text-white/40 mb-6">
          1-week outlook based on votes from the last 24 hours.
          {!canVote && (
            <span className="ml-1 text-white/30">Upgrade to Essential or Premium to vote.</span>
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {INSTRUMENTS.map((code) => {
            const bias = biasMap[code] || {
              instrument: code,
              bullish: 0,
              bearish: 0,
              neutral: 0,
              total: 0,
            };
            return (
              <CommunityBiasCard
                key={code}
                bias={bias}
                userVote={voteMap[code] ?? null}
                canVote={canVote}
                timeframe={TIMEFRAME}
              />
            );
          })}
        </div>
      </section>

      {/* Leaderboard Section */}
      <section>
        <h2 className="text-2xl font-serif font-bold text-white mb-4">Leaderboard</h2>
        <p className="text-sm text-white/40 mb-6">
          Top traders ranked by a composite score of win rate, consistency, and risk-reward ratio.
          Updated daily for users with 10+ closed trades who have opted in.
        </p>
        <LeaderboardTable entries={leaderboard} currentUserName={currentUserDisplayName} />
      </section>

      {/* Disclaimer */}
      <section className="border-t border-white/[0.06] pt-6 pb-8">
        <p className="text-xs text-white/20 max-w-3xl mx-auto text-center leading-relaxed">
          Community bias votes reflect the collective opinion of Tradeora users and do not constitute financial advice.
          Leaderboard rankings are based on self-reported trade data and are provided for informational purposes only.
          Past performance is not indicative of future results.
        </p>
      </section>
    </div>
  );
}
