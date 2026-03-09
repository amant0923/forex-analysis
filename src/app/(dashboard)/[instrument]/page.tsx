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
  daily: { active: "bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-200", text: "text-indigo-600" },
  "1week": { active: "bg-violet-50 border-violet-200 text-violet-700 ring-1 ring-violet-200", text: "text-violet-600" },
  "1month": { active: "bg-cyan-50 border-cyan-200 text-cyan-700 ring-1 ring-cyan-200", text: "text-cyan-600" },
  "3month": { active: "bg-amber-50 border-amber-200 text-amber-700 ring-1 ring-amber-200", text: "text-amber-600" },
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
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200/60">
        {/* Colored top accent bar */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1",
          biasDir === "bullish" && "bg-gradient-to-r from-emerald-400 to-emerald-500",
          biasDir === "bearish" && "bg-gradient-to-r from-red-400 to-red-500",
          biasDir === "neutral" && "bg-gradient-to-r from-gray-300 to-gray-400",
        )} />

        <div className="flex items-start gap-5 pt-1">
          <InstrumentIcon code={inst.code} size="lg" />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                {inst.code}
              </h2>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                  inst.category === "forex"
                    ? "bg-indigo-50 text-indigo-600"
                    : "bg-violet-50 text-violet-600"
                )}
              >
                {inst.category}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">{inst.name}</p>

            {/* Large bias direction display */}
            {selectedBias && (
              <div
                className={cn(
                  "mt-4 inline-flex items-center gap-2 rounded-xl border px-5 py-2.5",
                  biasDir === "bullish" &&
                    "border-emerald-200 bg-emerald-50",
                  biasDir === "bearish" && "border-red-200 bg-red-50",
                  biasDir === "neutral" && "border-gray-200 bg-gray-50"
                )}
              >
                <DirectionIcon
                  className={cn(
                    "h-6 w-6",
                    biasDir === "bullish" && "text-emerald-500",
                    biasDir === "bearish" && "text-red-500",
                    biasDir === "neutral" && "text-gray-400"
                  )}
                />
                <span
                  className={cn(
                    "text-xl font-extrabold tracking-wide",
                    biasDir === "bullish" && "text-emerald-600",
                    biasDir === "bearish" && "text-red-600",
                    biasDir === "neutral" && "text-gray-500"
                  )}
                >
                  {biasDir.toUpperCase()}
                </span>
                <span className="ml-2 text-xs text-gray-400">
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
                "relative rounded-xl border p-3 text-center transition-all duration-200 cursor-pointer",
                isSelected
                  ? tfColor.active
                  : "border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
              )}
            >
              <p
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-widest",
                  isSelected ? tfColor.text : "text-gray-400"
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
      <div className="mb-6 border-t border-gray-200" />

      <BiasDetail bias={selectedBias} articles={allArticles} />
    </div>
  );
}
