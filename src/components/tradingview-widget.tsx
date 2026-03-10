"use client";

import { useEffect, useRef, memo } from "react";

const TV_SYMBOL_MAP: Record<string, string> = {
  EURUSD: "FX:EURUSD",
  GBPUSD: "FX:GBPUSD",
  DXY: "TVC:DXY",
  US30: "AMEX:DIA",
  NAS100: "NASDAQ:QQQ",
  SP500: "AMEX:SPY",
  GER40: "XETR:DAX",
};

const TV_PROXY_LABEL: Record<string, string> = {
  US30: "DIA ETF (Dow Jones proxy)",
  NAS100: "QQQ ETF (Nasdaq 100 proxy)",
  SP500: "SPY ETF (S&P 500 proxy)",
  GER40: "DAX Index",
};

interface TradingViewWidgetProps {
  instrument: string;
  height?: number;
  compact?: boolean;
}

function TradingViewWidgetInner({ instrument, height = 500, compact = false }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: TV_SYMBOL_MAP[instrument] ?? instrument,
      interval: compact ? "60" : "D",
      timezone: "Etc/UTC",
      theme: "light",
      style: "1",
      locale: "en",
      hide_top_toolbar: compact,
      hide_legend: compact,
      allow_symbol_change: !compact,
      save_image: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });

    container.appendChild(script);

    return () => {
      if (container) container.innerHTML = "";
    };
  }, [instrument, compact]);

  const proxyLabel = TV_PROXY_LABEL[instrument];

  return (
    <div className="relative">
      <div
        className="tradingview-widget-container rounded-lg overflow-hidden border border-gray-200"
        style={{ height }}
      >
        <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      </div>
      {proxyLabel && !compact && (
        <p className="text-[10px] text-gray-400 mt-1 text-right">
          Showing {proxyLabel}
        </p>
      )}
    </div>
  );
}

export const TradingViewWidget = memo(TradingViewWidgetInner);
