import { getTrackRecordStats } from "@/lib/queries";
import type { TrackRecordStats, BiasOutcome } from "@/types";
import { BrokerCTA } from "@/components/broker-cta";

const TIMEFRAME_LABELS: Record<string, string> = {
  daily: "Daily",
  "1week": "1 Week",
  "1month": "1 Month",
  "3month": "3 Month",
};

function DirectionBadge({ direction, isCorrect }: { direction: string; isCorrect?: boolean | null }) {
  const colors = {
    bullish: "text-[#2D5A3D] bg-[#2D5A3D]/10 border-[#2D5A3D]/20",
    bearish: "text-[#8B2252] bg-[#8B2252]/10 border-[#8B2252]/20",
    neutral: "text-gray-400 bg-gray-400/10 border-gray-400/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${colors[direction as keyof typeof colors] || colors.neutral}`}>
      {direction === "bullish" ? "\u2191" : direction === "bearish" ? "\u2193" : "\u2194"} {direction}
    </span>
  );
}

function CorrectBadge({ isCorrect }: { isCorrect: boolean | null }) {
  if (isCorrect === null) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20">Pending</span>;
  }
  return isCorrect ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold text-[#2D5A3D] bg-[#2D5A3D]/10 border border-[#2D5A3D]/20">Correct</span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold text-[#8B2252] bg-[#8B2252]/10 border border-[#8B2252]/20">Incorrect</span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
      <p className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-1">{label}</p>
      <p className="text-3xl font-serif font-bold text-white">{value}</p>
      {sub && <p className="text-sm text-white/40 mt-1">{sub}</p>}
    </div>
  );
}

function AccuracyBar({ accuracy, total }: { accuracy: number; total: number }) {
  const width = total > 0 ? accuracy : 0;
  const color = accuracy >= 60 ? "#2D5A3D" : accuracy >= 50 ? "#D97706" : "#8B2252";
  return (
    <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${width}%`, backgroundColor: color }} />
    </div>
  );
}

export default async function TrackRecordPage() {
  const stats: TrackRecordStats = await getTrackRecordStats();

  const daysSinceFirst = stats.overall.first_prediction
    ? Math.floor((Date.now() - new Date(stats.overall.first_prediction).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="text-center space-y-3 pt-4">
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white">Track Record</h1>
        <p className="text-lg text-white/50 max-w-2xl mx-auto">
          Transparent, unedited history of every AI bias prediction vs. actual market outcome.
          No cherry-picking. No hiding losses.
        </p>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Overall Accuracy"
          value={stats.overall.total > 0 ? `${stats.overall.accuracy}%` : "\u2014"}
          sub={`${stats.overall.correct} of ${stats.overall.total} predictions`}
        />
        <StatCard
          label="Total Scored"
          value={stats.overall.total.toLocaleString()}
          sub={`Over ${daysSinceFirst} days`}
        />
        <StatCard
          label="Current Streak"
          value={stats.overall.current_streak > 0 ? `${stats.overall.current_streak}` : "\u2014"}
          sub={stats.overall.streak_type === "win" ? "Consecutive correct" : stats.overall.streak_type === "loss" ? "Consecutive incorrect" : undefined}
        />
        <StatCard
          label="Pending"
          value={stats.pending.length.toString()}
          sub="Awaiting settlement"
        />
      </div>

      {/* By Timeframe */}
      <section>
        <h2 className="text-2xl font-serif font-bold text-white mb-4">Accuracy by Timeframe</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.by_timeframe.map((tf) => (
            <div key={tf.timeframe} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white/60">{TIMEFRAME_LABELS[tf.timeframe] || tf.timeframe}</p>
                <p className="text-xl font-serif font-bold text-white">{tf.total > 0 ? `${tf.accuracy}%` : "\u2014"}</p>
              </div>
              <AccuracyBar accuracy={tf.accuracy} total={tf.total} />
              <p className="text-xs text-white/30">{tf.correct} correct of {tf.total} predictions</p>
            </div>
          ))}
        </div>
      </section>

      {/* By Instrument */}
      <section>
        <h2 className="text-2xl font-serif font-bold text-white mb-4">Accuracy by Instrument</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {stats.by_instrument.map((inst) => {
            const color = inst.accuracy >= 60 ? "text-[#2D5A3D]" : inst.accuracy >= 50 ? "text-amber-400" : "text-[#8B2252]";
            return (
              <div key={inst.instrument} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{inst.instrument}</p>
                  <p className="text-xs text-white/30">{inst.correct}/{inst.total} correct</p>
                </div>
                <p className={`text-xl font-serif font-bold ${inst.total > 0 ? color : "text-white/20"}`}>
                  {inst.total > 0 ? `${inst.accuracy}%` : "\u2014"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Predictions Table */}
      <section>
        <h2 className="text-2xl font-serif font-bold text-white mb-4">Recent Predictions</h2>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-xs uppercase tracking-wider text-white/30 font-semibold px-4 py-3">Date</th>
                  <th className="text-left text-xs uppercase tracking-wider text-white/30 font-semibold px-4 py-3">Instrument</th>
                  <th className="text-left text-xs uppercase tracking-wider text-white/30 font-semibold px-4 py-3">Timeframe</th>
                  <th className="text-left text-xs uppercase tracking-wider text-white/30 font-semibold px-4 py-3">Predicted</th>
                  <th className="text-left text-xs uppercase tracking-wider text-white/30 font-semibold px-4 py-3">Actual</th>
                  <th className="text-right text-xs uppercase tracking-wider text-white/30 font-semibold px-4 py-3">Change</th>
                  <th className="text-center text-xs uppercase tracking-wider text-white/30 font-semibold px-4 py-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {stats.recent.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-white/30 py-8">No settled predictions yet</td>
                  </tr>
                ) : (
                  stats.recent.map((outcome) => (
                    <tr key={outcome.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                        {new Date(outcome.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-white font-medium">{outcome.instrument}</td>
                      <td className="px-4 py-3 text-white/60">{TIMEFRAME_LABELS[outcome.timeframe] || outcome.timeframe}</td>
                      <td className="px-4 py-3"><DirectionBadge direction={outcome.predicted_direction} /></td>
                      <td className="px-4 py-3">{outcome.actual_direction && <DirectionBadge direction={outcome.actual_direction} />}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm whitespace-nowrap">
                        {outcome.price_change_pct !== null ? (
                          <span className={outcome.price_change_pct > 0 ? "text-[#2D5A3D]" : outcome.price_change_pct < 0 ? "text-[#8B2252]" : "text-white/40"}>
                            {outcome.price_change_pct > 0 ? "+" : ""}{outcome.price_change_pct.toFixed(2)}%
                          </span>
                        ) : "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-center"><CorrectBadge isCorrect={outcome.is_correct} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pending Predictions */}
      {stats.pending.length > 0 && (
        <section>
          <h2 className="text-2xl font-serif font-bold text-white mb-4">
            Pending Predictions
            <span className="text-base font-normal text-white/40 ml-2">({stats.pending.length} awaiting settlement)</span>
          </h2>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-xs uppercase tracking-wider text-white/30 font-semibold px-4 py-3">Date</th>
                    <th className="text-left text-xs uppercase tracking-wider text-white/30 font-semibold px-4 py-3">Instrument</th>
                    <th className="text-left text-xs uppercase tracking-wider text-white/30 font-semibold px-4 py-3">Timeframe</th>
                    <th className="text-left text-xs uppercase tracking-wider text-white/30 font-semibold px-4 py-3">Prediction</th>
                    <th className="text-left text-xs uppercase tracking-wider text-white/30 font-semibold px-4 py-3">Open Price</th>
                    <th className="text-left text-xs uppercase tracking-wider text-white/30 font-semibold px-4 py-3">Settles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {stats.pending.map((outcome) => (
                    <tr key={outcome.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                        {new Date(outcome.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-white font-medium">{outcome.instrument}</td>
                      <td className="px-4 py-3 text-white/60">{TIMEFRAME_LABELS[outcome.timeframe] || outcome.timeframe}</td>
                      <td className="px-4 py-3"><DirectionBadge direction={outcome.predicted_direction} /></td>
                      <td className="px-4 py-3 text-white/60 font-mono">{outcome.open_price.toFixed(outcome.open_price < 10 ? 5 : 2)}</td>
                      <td className="px-4 py-3 text-white/40 whitespace-nowrap">
                        {new Date(outcome.settles_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Broker CTA */}
      <BrokerCTA />

      {/* Disclaimer */}
      <section className="border-t border-white/[0.06] pt-6 pb-8">
        <p className="text-xs text-white/20 max-w-3xl mx-auto text-center leading-relaxed">
          Past performance is not indicative of future results. The bias predictions shown on this page are generated by AI-powered analysis of publicly available news and economic data. They do not constitute financial advice, trading signals, or recommendations to buy or sell any financial instrument. Trading forex and CFDs carries a high level of risk and may not be suitable for all investors. You should carefully consider your investment objectives, level of experience, and risk appetite before making any trading decisions. Tradeora is an educational and analytical tool only.
        </p>
      </section>
    </div>
  );
}
