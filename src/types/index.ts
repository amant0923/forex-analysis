export interface Instrument {
  code: string;
  name: string;
  category: "forex" | "index" | "commodity" | "crypto";
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
  confidence: number | null;
  confidence_rationale: string | null;
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
  USD: ["DXY", "USDJPY", "USDCAD", "USDCHF", "XAUUSD", "XAGUSD", "US30", "NAS100", "SP500", "BTCUSD", "ETHUSD", "USOIL"],
  EUR: ["EURUSD", "EURJPY", "EURGBP", "GER40"],
  GBP: ["GBPUSD", "GBPJPY", "EURGBP"],
  JPY: ["USDJPY", "EURJPY", "GBPJPY"],
  AUD: ["AUDUSD"],
  CAD: ["USDCAD", "USOIL"],
  NZD: ["NZDUSD"],
  CHF: ["USDCHF"],
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

// Trading Journal Types

export interface TradingAccount {
  id: number;
  user_id: number;
  name: string;
  broker: string | null;
  account_size: number;
  currency: string;
  leverage: number | null;
  created_at: string;
  updated_at: string;
}

export interface Playbook {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  instrument: string | null;
  timeframe: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaybookRule {
  id: number;
  playbook_id: number;
  category: "entry" | "exit" | "risk";
  rule_text: string;
  sort_order: number;
}

export interface PlaybookWithRules extends Playbook {
  rules: PlaybookRule[];
}

export interface Trade {
  id: number;
  user_id: number;
  account_id: number;
  playbook_id: number | null;
  instrument: string;
  direction: "buy" | "sell";
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  lot_size: number;
  opened_at: string;
  closed_at: string | null;
  pnl_pips: number | null;
  pnl_ticks: number | null;
  pnl_dollars: number | null;
  rr_ratio: number | null;
  account_pct_impact: number | null;
  session: "london" | "new_york" | "asia" | "overlap" | null;
  timeframe_traded: string | null;
  emotion_before: "confident" | "calm" | "anxious" | "FOMO" | "revenge" | "uncertain" | null;
  emotion_after: "satisfied" | "frustrated" | "relieved" | "regretful" | "neutral" | null;
  rule_adherence_score: number | null;
  rule_adherence_details: { rule_id: number; followed: boolean }[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeScreenshot {
  id: number;
  trade_id: number;
  url: string;
  label: "entry" | "exit" | "setup" | "other" | null;
  uploaded_at: string;
}

export interface TradeAiReview {
  id: number;
  trade_id: number;
  verdict: "good" | "acceptable" | "poor";
  bias_alignment: "with" | "against" | "neutral";
  bias_alignment_explanation: string | null;
  rule_adherence_review: string | null;
  risk_assessment: string | null;
  timing_analysis: string | null;
  psychology_flag: string | null;
  suggestions: string[];
  bias_snapshot: Record<string, unknown> | null;
  events_snapshot: Record<string, unknown> | null;
  generated_at: string;
}

export interface TradeWithDetails extends Trade {
  screenshots: TradeScreenshot[];
  ai_review: TradeAiReview | null;
  playbook_name: string | null;
  account_name: string | null;
}

export interface JournalStats {
  total_trades: number;
  win_rate: number;
  avg_rr: number;
  pnl_today: number;
  pnl_week: number;
  pnl_month: number;
}

export interface BiasOutcome {
  id: number;
  bias_id: number;
  instrument: string;
  timeframe: "daily" | "1week" | "1month" | "3month";
  predicted_direction: "bullish" | "bearish" | "neutral";
  open_price: number;
  close_price: number | null;
  price_change_pct: number | null;
  actual_direction: "bullish" | "bearish" | "neutral" | null;
  is_correct: boolean | null;
  generated_at: string;
  settles_at: string;
  settled_at: string | null;
}

export interface TrackRecordStats {
  overall: {
    total: number;
    correct: number;
    accuracy: number;
    current_streak: number;
    streak_type: "win" | "loss" | null;
    first_prediction: string | null;
  };
  by_timeframe: {
    timeframe: string;
    total: number;
    correct: number;
    accuracy: number;
  }[];
  by_instrument: {
    instrument: string;
    total: number;
    correct: number;
    accuracy: number;
  }[];
  recent: BiasOutcome[];
  pending: BiasOutcome[];
}

export interface CommunityBias {
  instrument: string;
  bullish: number;
  bearish: number;
  neutral: number;
  total: number;
}

export interface LeaderboardEntry {
  rank: number;
  display_name: string;
  total_trades: number;
  win_rate: number;
  consistency_score: number | null;
  avg_rr: number | null;
  snapshot_date: string;
}

export type UserTier = "free" | "essential" | "premium";

export interface TierLimits {
  max_trades_per_day: number | null;
  max_playbooks: number | null;
  max_screenshots_per_trade: number;
  max_accounts: number | null;
  max_ai_analyses_per_day: number | null;
  history_days: number | null;
  has_chat: boolean;
  has_weekly_report: boolean;
  has_monthly_report: boolean;
  has_csv_export: boolean;
  can_vote_community: boolean;
  can_join_leaderboard: boolean;
  has_trader_insights: boolean;
  has_dna_profile: boolean;
}

export interface TraderInsight {
  title: string;
  stat: string;
  description: string;
  category: 'bias_alignment' | 'session' | 'instrument' | 'emotion' | 'pattern' | 'risk';
}

export interface DNAProfile {
  trading_style: string;
  strengths: string[];
  blind_spots: string[];
  bias_alignment_score: number;
  emotional_patterns: string;
  session_performance: string;
  goals: string[];
}

export interface TraderInsightsResponse {
  eligible: boolean;
  trade_count: number;
  insights: TraderInsight[] | null;
  generated_at: string | null;
}

export interface LiveArticle {
  id: number;
  title: string;
  source: string | null;
  source_tier: number | null;
  summary: string | null;
  url: string;
  channel_posted_at: string;
  instruments: {
    code: string;
    direction: string | null;
    confidence: string | null;
  }[];
}
