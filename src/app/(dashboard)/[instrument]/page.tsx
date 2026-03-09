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
import { TrendingUp, TrendingDown, Minus, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ instrument: string }>;
  searchParams: Promise<{ tf?: string }>;
}

const tfLabels: Record<string, string> = {
  daily: "Daily",
  "1week": "1 Week",
  "1month": "1 Month",
  "3month": "3 Months",
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
    <div>
      {/* Back link */}
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All Instruments
      </Link>

      {/* Two-column layout: hero left, timeframes right */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Hero card — spans 2 cols */}
        <div className="relative overflow-hidden rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60 lg:col-span-2">
          <div className={cn(
            "absolute top-0 left-0 right-0 h-0.5",
            biasDir === "bullish" && "bg-emerald-500",
            biasDir === "bearish" && "bg-red-500",
            biasDir === "neutral" && "bg-gray-300",
          )} />

          <div className="flex items-start gap-4 pt-1">
            <InstrumentIcon code={inst.code} size="lg" />
            <div className="flex-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  {inst.code}
                </h1>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                    inst.category === "forex"
                      ? "bg-indigo-50 text-indigo-600"
                      : "bg-violet-50 text-violet-600"
                  )}
                >
                  {inst.category}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-gray-500">{inst.name}</p>

              {selectedBias && (
                <div
                  className={cn(
                    "mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2",
                    biasDir === "bullish" && "border-emerald-200 bg-emerald-50",
                    biasDir === "bearish" && "border-red-200 bg-red-50",
                    biasDir === "neutral" && "border-gray-200 bg-gray-50"
                  )}
                >
                  <DirectionIcon
                    className={cn(
                      "h-5 w-5",
                      biasDir === "bullish" && "text-emerald-500",
                      biasDir === "bearish" && "text-red-500",
                      biasDir === "neutral" && "text-gray-400"
                    )}
                  />
                  <span
                    className={cn(
                      "text-lg font-extrabold tracking-wide",
                      biasDir === "bullish" && "text-emerald-700",
                      biasDir === "bearish" && "text-red-700",
                      biasDir === "neutral" && "text-gray-500"
                    )}
                  >
                    {biasDir.toUpperCase()}
                  </span>
                  <span className="ml-1 text-xs text-gray-400">
                    {tfLabels[selectedTf]} outlook
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timeframe selector — right column */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 lg:grid-rows-4">
          {timeframes.map((tfItem) => {
            const isSelected = tfItem.key === selectedTf;
            const tfBias = biases[tfItem.key];
            const dir = tfBias?.direction ?? "neutral";
            return (
              <a
                key={tfItem.key}
                href={`/${inst.code}?tf=${tfItem.key}`}
                className={cn(
                  "flex items-center justify-between rounded-lg border px-4 py-2.5 transition-all duration-150 cursor-pointer",
                  isSelected
                    ? "border-indigo-200 bg-indigo-50 ring-1 ring-indigo-200 shadow-sm"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                )}
              >
                <span
                  className={cn(
                    "text-[13px] font-semibold",
                    isSelected ? "text-indigo-700" : "text-gray-600"
                  )}
                >
                  {tfItem.label}
                </span>
                <BiasBadge direction={dir} label="" size="sm" />
              </a>
            );
          })}
        </div>
      </div>

      {/* Analysis content */}
      <BiasDetail bias={selectedBias} articles={allArticles} />
    </div>
  );
}
