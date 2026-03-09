import { notFound } from "next/navigation";
import {
  getInstruments,
  getLatestBiases,
  getArticlesForInstrument,
  getArticlesByIds,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { BiasBadge } from "@/components/bias-badge";
import { BiasDetail } from "@/components/bias-detail";
import { InstrumentIcon } from "@/components/instrument-icon";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ instrument: string }>;
  searchParams: Promise<{ tf?: string }>;
}

const tfColors: Record<string, { active: string; text: string }> = {
  daily: { active: "bg-purple-500/20 border-purple-500/30 text-purple-300", text: "text-purple-400" },
  "1week": { active: "bg-blue-500/20 border-blue-500/30 text-blue-300", text: "text-blue-400" },
  "1month": { active: "bg-cyan-500/20 border-cyan-500/30 text-cyan-300", text: "text-cyan-400" },
  "3month": { active: "bg-amber-500/20 border-amber-500/30 text-amber-300", text: "text-amber-400" },
};

export default async function InstrumentPage({
  params,
  searchParams,
}: PageProps) {
  const { instrument: instrumentParam } = await params;
  const { tf } = await searchParams;

  const instruments = await getInstruments();
  const inst = instruments.find(
    (i) => i.code === instrumentParam.toUpperCase()
  );
  if (!inst) notFound();

  const biases = await getLatestBiases(inst.code);
  const selectedTf = tf || "daily";
  const selectedBias = biases[selectedTf] ?? null;

  const dayMap: Record<string, number> = {
    daily: 1,
    "1week": 7,
    "1month": 30,
    "3month": 90,
  };
  const articles = await getArticlesForInstrument(
    inst.code,
    dayMap[selectedTf] ?? 7
  );

  const supportingIds = (selectedBias?.supporting_articles ?? []).map(
    (sa) => sa.article_id
  );
  const extraArticles = await getArticlesByIds(
    supportingIds.filter((id) => !articles.some((a) => a.id === id))
  );
  const allArticles = [...articles, ...extraArticles];

  const timeframes = [
    { key: "daily", label: "Daily" },
    { key: "1week", label: "1 Week" },
    { key: "1month", label: "1 Month" },
    { key: "3month", label: "3 Months" },
  ];

  const biasDir = selectedBias?.direction ?? "neutral";
  const DirectionIcon =
    biasDir === "bullish"
      ? TrendingUp
      : biasDir === "bearish"
        ? TrendingDown
        : Minus;

  return (
    <div className="max-w-4xl">
      {/* Instrument hero header */}
      <div
        className={cn(
          "relative mb-8 overflow-hidden rounded-2xl border p-8 backdrop-blur-md",
          biasDir === "bullish" &&
            "border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] via-emerald-500/[0.02] to-transparent",
          biasDir === "bearish" &&
            "border-red-500/20 bg-gradient-to-br from-red-500/[0.08] via-red-500/[0.02] to-transparent",
          biasDir === "neutral" &&
            "border-white/[0.06] bg-gradient-to-br from-zinc-500/[0.06] via-transparent to-transparent"
        )}
      >
        {/* Decorative glow */}
        <div
          className={cn(
            "pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl",
            biasDir === "bullish" && "bg-emerald-500/10",
            biasDir === "bearish" && "bg-red-500/10",
            biasDir === "neutral" && "bg-purple-500/10"
          )}
        />

        <div className="relative flex items-start gap-5">
          <InstrumentIcon code={inst.code} size="lg" />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="font-data text-3xl font-bold tracking-tight text-zinc-100">
                {inst.code}
              </h2>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  inst.category === "forex"
                    ? "border-purple-500/20 bg-purple-500/10 text-purple-400"
                    : "border-blue-500/20 bg-blue-500/10 text-blue-400"
                )}
              >
                {inst.category}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-zinc-400">{inst.name}</p>

            {/* Large bias direction display */}
            {selectedBias && (
              <div
                className={cn(
                  "mt-4 inline-flex items-center gap-2 rounded-xl border px-5 py-2.5",
                  biasDir === "bullish" &&
                    "border-emerald-500/30 bg-emerald-500/15",
                  biasDir === "bearish" && "border-red-500/30 bg-red-500/15",
                  biasDir === "neutral" && "border-zinc-500/20 bg-zinc-500/10"
                )}
              >
                <DirectionIcon
                  className={cn(
                    "h-6 w-6",
                    biasDir === "bullish" && "text-emerald-400",
                    biasDir === "bearish" && "text-red-400",
                    biasDir === "neutral" && "text-zinc-400"
                  )}
                />
                <span
                  className={cn(
                    "text-xl font-extrabold tracking-wide",
                    biasDir === "bullish" && "text-emerald-300",
                    biasDir === "bearish" && "text-red-300",
                    biasDir === "neutral" && "text-zinc-400"
                  )}
                >
                  {biasDir.toUpperCase()}
                </span>
                <span className="ml-2 text-xs text-zinc-500">
                  {timeframes.find((t) => t.key === selectedTf)?.label} outlook
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeframe tabs with color coding */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {timeframes.map((tfItem) => {
          const isSelected = tfItem.key === selectedTf;
          const tfColor = tfColors[tfItem.key];
          return (
            <a
              key={tfItem.key}
              href={`/${inst.code}?tf=${tfItem.key}`}
              className={cn(
                "relative rounded-xl border p-3 text-center transition-all duration-200",
                isSelected
                  ? tfColor.active
                  : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
              )}
            >
              <p
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-widest",
                  isSelected ? tfColor.text : "text-zinc-500"
                )}
              >
                {tfItem.label}
              </p>
              <div className="mt-1">
                <BiasBadge
                  direction={biases[tfItem.key]?.direction ?? null}
                  label=""
                  size={isSelected ? "lg" : "sm"}
                />
              </div>
            </a>
          );
        })}
      </div>

      {/* Divider */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      <BiasDetail bias={selectedBias} articles={allArticles} />
    </div>
  );
}
