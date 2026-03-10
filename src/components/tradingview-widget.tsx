"use client";

import { useEffect, useRef, memo } from "react";

const TV_SYMBOL_MAP: Record<string, string> = {
  EURUSD: "FX:EURUSD",
  GBPUSD: "FX:GBPUSD",
  DXY: "TVC:DXY",
  US30: "TVC:DJI",
  NAS100: "NASDAQ:NDX",
  SP500: "SP:SPX",
  GER40: "XETR:DAX",
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

  return (
    <div
      className="tradingview-widget-container rounded-lg overflow-hidden border border-gray-200"
      style={{ height }}
    >
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}

export const TradingViewWidget = memo(TradingViewWidgetInner);
