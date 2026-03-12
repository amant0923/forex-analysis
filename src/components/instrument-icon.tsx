import { BarChart3, Cpu, TrendingUp } from "lucide-react";

const FLAG_URL = "https://hatscripts.github.io/circle-flags/flags";

const instrumentConfig: Record<
  string,
  {
    type: "flags" | "icon";
    flags?: string[];
    icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    bgColor?: string;
    textColor?: string;
  }
> = {
  DXY: { type: "flags", flags: ["us"] },
  EURUSD: { type: "flags", flags: ["eu", "us"] },
  GBPUSD: { type: "flags", flags: ["gb", "us"] },
  GER40: { type: "flags", flags: ["de"] },
  US30: { type: "flags", flags: ["us"] },
  NAS100: { type: "flags", flags: ["us"] },
  SP500: { type: "flags", flags: ["us"] },
  USDJPY: { type: "flags", flags: ["us", "jp"] },
  EURJPY: { type: "flags", flags: ["eu", "jp"] },
  GBPJPY: { type: "flags", flags: ["gb", "jp"] },
  EURGBP: { type: "flags", flags: ["eu", "gb"] },
  XAUUSD: { type: "flags", flags: ["us"] },
  XAGUSD: { type: "flags", flags: ["us"] },
};

export function InstrumentIcon({
  code,
  size = "md",
}: {
  code: string;
  size?: "sm" | "md" | "lg";
}) {
  const config = instrumentConfig[code];
  if (!config) return null;

  const flagSizes = { sm: 18, md: 26, lg: 36 };
  const iconContainerSizes = { sm: 22, md: 30, lg: 40 };
  const iconInnerSizes = { sm: 12, md: 16, lg: 22 };
  const fs = flagSizes[size];
  const cs = iconContainerSizes[size];
  const is = iconInnerSizes[size];

  if (config.type === "flags" && config.flags) {
    return (
      <div className="flex items-center" style={{ minWidth: config.flags.length === 1 ? fs : fs + fs * 0.5 }}>
        {config.flags.map((flag, idx) => (
          <img
            key={flag}
            src={`${FLAG_URL}/${flag}.svg`}
            alt={flag.toUpperCase()}
            width={fs}
            height={fs}
            className="rounded-full ring-1 ring-white/10"
            style={{
              marginLeft: idx > 0 ? -(fs * 0.25) : 0,
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
      className={`flex items-center justify-center rounded ${config.bgColor}`}
      style={{ width: cs, height: cs }}
    >
      <Icon className={config.textColor} style={{ width: is, height: is }} />
    </div>
  );
}

export { instrumentConfig };
