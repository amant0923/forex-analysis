export interface Instrument {
  code: string;
  name: string;
  category: "forex" | "index";
}

export interface Article {
  id: number;
  title: string;
  content: string | null;
  url: string;
  source: string | null;
  published_at: string | null;
  created_at: string;
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
}
