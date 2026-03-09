export interface Instrument {
  code: string;
  name: string;
  category: "forex" | "index";
}

export interface Article {
  id: number;
  title: string;
  content: string | null;
  summary: string | null;
  url: string;
  source: string | null;
  published_at: string | null;
  created_at: string;
}

export interface ArticleAnalysis {
  id: number;
  article_id: number;
  instrument: string;
  event: string;
  mechanism: string;
  impact_direction: "bullish" | "bearish" | "neutral";
  impact_timeframes: string[];
  confidence: "high" | "medium" | "low";
  commentary: string;
  generated_at: string;
}

export interface ArticleWithAnalyses extends Article {
  analyses: ArticleAnalysis[];
  instruments: string[];
}

export interface Bias {
  id: number;
  instrument: string;
  timeframe: "daily" | "1week" | "1month" | "3month";
  direction: "bullish" | "bearish" | "neutral";
  summary: string | null;
  key_drivers: string[] | null;
  supporting_articles: { article_id: number; relevance: string }[] | null;
  generated_at: string;
}

export interface InstrumentWithBias extends Instrument {
  biases: Record<string, Bias | null>;
  article_count: number;
  latestArticle: {
    id: number;
    title: string;
    source: string | null;
    impact_direction: "bullish" | "bearish" | "neutral" | null;
    mechanism: string | null;
  } | null;
}
