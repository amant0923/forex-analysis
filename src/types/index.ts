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

export interface EconomicEvent {
  id: number;
  event_name: string;
  country: string;
  currency: string;
  event_date: string;
  event_time: string;
  impact: "high" | "medium" | "low";
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  created_at: string;
  updated_at: string;
}

// Maps currency to affected instruments
export const CURRENCY_INSTRUMENTS: Record<string, string[]> = {
  USD: ["DXY", "US30", "NAS100", "SP500"],
  EUR: ["EURUSD", "GER40"],
  GBP: ["GBPUSD"],
};

export interface InstrumentQuote {
  instrument: string;
  price: number;
  change: number;
  change_pct: number;
  day_high: number;
  day_low: number;
  updated_at: string;
}

export interface InstrumentSentiment {
  instrument: string;
  score: number;
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  total_articles: number;
}

export interface MarketSentiment {
  score: number;
  label: "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";
  instruments: InstrumentSentiment[];
  driver_summary: string;
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
  quote: InstrumentQuote | null;
  sentiment: InstrumentSentiment | null;
}
