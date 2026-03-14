"use client";

const BROKERS = [
  { name: "IC Markets", url: "https://www.icmarkets.com" },
  { name: "Pepperstone", url: "https://www.pepperstone.com" },
  { name: "Oanda", url: "https://www.oanda.com" },
];

async function trackClick(broker: string) {
  try {
    await fetch("/api/affiliate/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ broker, referrer: window.location.pathname }),
    });
  } catch {
    // Non-blocking
  }
}

export function BrokerCTA() {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-sm text-white/50 text-center sm:text-left">
        Ready to trade?{" "}
        <span className="text-white/70">Open an account with a trusted broker.</span>
      </p>
      <div className="flex items-center gap-3">
        {BROKERS.map((broker) => (
          <button
            key={broker.name}
            onClick={async () => {
              await trackClick(broker.name);
              window.open(broker.url, "_blank", "noopener,noreferrer");
            }}
            className="bg-white/10 hover:bg-white/15 transition-colors rounded-lg px-4 py-2 text-xs font-medium text-white cursor-pointer whitespace-nowrap"
          >
            {broker.name}
          </button>
        ))}
      </div>
    </div>
  );
}
