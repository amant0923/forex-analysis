const FOREX_INSTRUMENTS = ["EURUSD", "GBPUSD", "USDJPY", "EURJPY", "GBPJPY", "EURGBP", "AUDUSD", "USDCAD", "NZDUSD", "USDCHF"];
const CFD_INSTRUMENTS = ["DXY", "XAUUSD", "XAGUSD", "GER40", "US30", "NAS100", "SP500", "USOIL"];
const CRYPTO_INSTRUMENTS = ["BTCUSD", "ETHUSD"];

const PIP_SIZE: Record<string, number> = {
  EURUSD: 0.0001,
  GBPUSD: 0.0001,
  USDJPY: 0.01,
  EURJPY: 0.01,
  GBPJPY: 0.01,
  EURGBP: 0.0001,
  AUDUSD: 0.0001,
  USDCAD: 0.0001,
  NZDUSD: 0.0001,
  USDCHF: 0.0001,
};

const TICK_SIZE: Record<string, number> = {
  DXY: 0.01,
  XAUUSD: 0.01,
  XAGUSD: 0.001,
  GER40: 1,
  US30: 1,
  NAS100: 0.25,
  SP500: 0.25,
  USOIL: 0.01,
  BTCUSD: 1,
  ETHUSD: 0.01,
};

export function isForex(instrument: string): boolean {
  return FOREX_INSTRUMENTS.includes(instrument);
}

export function isCFD(instrument: string): boolean {
  return CFD_INSTRUMENTS.includes(instrument) || CRYPTO_INSTRUMENTS.includes(instrument);
}

export function calculatePnl(
  instrument: string,
  direction: "buy" | "sell",
  entryPrice: number,
  exitPrice: number,
  lotSize: number,
  accountSize: number
): {
  pnl_pips: number | null;
  pnl_ticks: number | null;
  pnl_dollars: number;
  rr_ratio: number | null;
  account_pct_impact: number;
} {
  const priceDiff = direction === "buy" ? exitPrice - entryPrice : entryPrice - exitPrice;

  let pnl_pips: number | null = null;
  let pnl_ticks: number | null = null;
  let pnl_dollars: number;

  if (isForex(instrument)) {
    const pipSize = PIP_SIZE[instrument] || 0.0001;
    pnl_pips = priceDiff / pipSize;
    pnl_dollars = pnl_pips * lotSize * 10;
  } else {
    const tickSize = TICK_SIZE[instrument] || 1;
    pnl_ticks = priceDiff / tickSize;
    pnl_dollars = priceDiff * lotSize;
  }

  const account_pct_impact = accountSize > 0 ? (pnl_dollars / accountSize) * 100 : 0;

  return {
    pnl_pips: pnl_pips !== null ? Math.round(pnl_pips * 100) / 100 : null,
    pnl_ticks: pnl_ticks !== null ? Math.round(pnl_ticks * 100) / 100 : null,
    pnl_dollars: Math.round(pnl_dollars * 100) / 100,
    rr_ratio: null,
    account_pct_impact: Math.round(account_pct_impact * 10000) / 10000,
  };
}

export function calculateRR(
  direction: "buy" | "sell",
  entryPrice: number,
  exitPrice: number,
  stopLoss: number
): number | null {
  if (!stopLoss) return null;
  const risk = Math.abs(entryPrice - stopLoss);
  if (risk === 0) return null;
  const reward = direction === "buy" ? exitPrice - entryPrice : entryPrice - exitPrice;
  return Math.round((reward / risk) * 100) / 100;
}
