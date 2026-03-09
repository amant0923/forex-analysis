import { BarChart3, Cpu, TrendingUp } from "lucide-react";

const FLAG_URL = "https://hatscripts.github.io/circle-flags/flags";

const instrumentConfig: Record<string, { type: "flags" | "icon"; flags?: string[]; icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; bgColor?: string; textColor?: string; label?: string }> = {
  DXY: { type: "flags", flags: ["us"] },
  EURUSD: { type: "flags", flags: ["eu", "us"] },
  GBPUSD: { type: "flags", flags: ["gb", "us"] },
  GER40: { type: "flags", flags: ["de"] },
  US30: { type: "icon", icon: BarChart3, bgColor: "bg-blue-50", textColor: "text-blue-700", label: "DOW" },
  NAS100: { type: "icon", icon: Cpu, bgColor: "bg-cyan-50", textColor: "text-cyan-700", label: "NDX" },
  SP500: { type: "icon", icon: TrendingUp, bgColor: "bg-amber-50", textColor: "text-amber-700", label: "SPX" },
};

export function InstrumentIcon({ code, size = "md" }: { code: string; size?: "sm" | "md" | "lg" }) {
  const config = instrumentConfig[code];
  if (!config) return null;

  const flagSizes = { sm: 22, md: 30, lg: 40 };
  const iconContainerSizes = { sm: 28, md: 36, lg: 48 };
  const iconInnerSizes = { sm: 14, md: 18, lg: 24 };
  const fs = flagSizes[size];
  const cs = iconContainerSizes[size];
  const is = iconInnerSizes[size];

  if (config.type === "flags" && config.flags) {
    const isSingleFlag = config.flags.length === 1;
    return (
      <div className="flex items-center" style={{ minWidth: isSingleFlag ? fs : fs + fs * 0.55 }}>
        {config.flags.map((flag, idx) => (
          <img
            key={flag}
            src={`${FLAG_URL}/${flag}.svg`}
            alt={flag.toUpperCase()}
            width={fs}
            height={fs}
            className="rounded-full shadow-sm ring-1 ring-gray-200/80"
            style={{
              marginLeft: idx > 0 ? -(fs * 0.28) : 0,
              zIndex: config.flags!.length - idx,
              position: "relative",
            }}
          />
        ))}
      </div>
    );
  }

  const Icon = config.icon!;
  return (
    <div
      className={`flex items-center justify-center rounded-lg ${config.bgColor} ring-1 ring-gray-200/50`}
      style={{ width: cs, height: cs }}
    >
      <Icon className={config.textColor} style={{ width: is, height: is }} />
    </div>
  );
}

export { instrumentConfig };
