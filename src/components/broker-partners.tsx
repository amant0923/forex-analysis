"use client";

const BROKERS = [
  {
    name: "IC Markets",
    tagline: "Raw Spreads from 0.0 pips",
    stats: ["Spreads from 0.0 pips", "200+ instruments", "Ultra-fast execution"],
    url: "https://www.icmarkets.com",
  },
  {
    name: "Pepperstone",
    tagline: "Award-Winning Broker",
    stats: ["1,200+ instruments", "Award-winning platform", "24/5 support"],
    url: "https://www.pepperstone.com",
  },
  {
    name: "Oanda",
    tagline: "Trusted Since 1996",
    stats: ["Globally regulated", "Powerful API access", "Competitive spreads"],
    url: "https://www.oanda.com",
  },
];

async function trackClick(broker: string) {
  try {
    await fetch("/api/affiliate/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ broker, referrer: window.location.pathname }),
    });
  } catch {
    // Non-blocking — don't prevent the redirect
  }
}

export function BrokerPartners() {
  return (
    <section className="mt-12 space-y-6">
      {/* Section header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-serif font-bold text-white">
          Start Trading
        </h2>
        <p className="text-sm text-white/40">
          Trusted brokers used by professional traders worldwide
        </p>
      </div>

      {/* Broker cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {BROKERS.map((broker) => (
          <div
            key={broker.name}
            className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between space-y-5"
          >
            {/* Header */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-serif font-bold text-white">
                  {broker.name}
                </h3>
                <span className="text-[10px] uppercase tracking-widest text-white/25 font-semibold border border-white/10 rounded px-2 py-0.5">
                  Partner
                </span>
              </div>
              <p className="text-sm text-white/50">{broker.tagline}</p>
            </div>

            {/* Stats */}
            <ul className="space-y-2">
              {broker.stats.map((stat) => (
                <li
                  key={stat}
                  className="flex items-center gap-2 text-xs text-white/40"
                >
                  <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                  {stat}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={async () => {
                await trackClick(broker.name);
                window.open(broker.url, "_blank", "noopener,noreferrer");
              }}
              className="w-full bg-white/10 hover:bg-white/15 transition-colors rounded-lg py-2.5 text-sm font-medium text-white cursor-pointer"
            >
              Open Account
            </button>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] text-white/15 text-center max-w-xl mx-auto leading-relaxed">
        Tradeora may receive compensation from partner brokers. Trading CFDs
        carries risk and may not be suitable for all investors.
      </p>
    </section>
  );
}
