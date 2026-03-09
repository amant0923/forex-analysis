import { notFound } from "next/navigation";
import { getInstruments, getLatestBiases, getArticlesForInstrument, getArticlesByIds } from "@/lib/queries";
import { BiasBadge } from "@/components/bias-badge";
import { BiasDetail } from "@/components/bias-detail";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ instrument: string }>;
  searchParams: Promise<{ tf?: string }>;
}

export default async function InstrumentPage({ params, searchParams }: PageProps) {
  const { instrument: instrumentParam } = await params;
  const { tf } = await searchParams;

  const instruments = await getInstruments();
  const inst = instruments.find((i) => i.code === instrumentParam.toUpperCase());
  if (!inst) notFound();

  const biases = await getLatestBiases(inst.code);
  const selectedTf = tf || "daily";
  const selectedBias = biases[selectedTf] ?? null;

  const dayMap: Record<string, number> = { daily: 1, "1week": 7, "1month": 30, "3month": 90 };
  const articles = await getArticlesForInstrument(inst.code, dayMap[selectedTf] ?? 7);

  const supportingIds = (selectedBias?.supporting_articles ?? []).map((sa) => sa.article_id);
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

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-100">{inst.code}</h2>
        <p className="text-sm text-zinc-500">{inst.name}</p>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-3">
        {timeframes.map((tfItem) => (
          <a key={tfItem.key} href={`/${inst.code}?tf=${tfItem.key}`}>
            <BiasBadge
              direction={biases[tfItem.key]?.direction ?? null}
              label={tfItem.label}
              size={tfItem.key === selectedTf ? "lg" : "sm"}
            />
          </a>
        ))}
      </div>

      <BiasDetail bias={selectedBias} articles={allArticles} />
    </div>
  );
}
