import { BarChart3, Cpu, TrendingUp } from "lucide-react";

const FLAG_URL = "https://flagcdn.com";

const instrumentConfig: Record<string, { type: "flags" | "icon"; flags?: string[]; icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; bgColor?: string; textColor?: string; label?: string }> = {
  DXY: { type: "flags", flags: ["us"] },
  EURUSD: { type: "flags", flags: ["eu", "us"] },
  GBPUSD: { type: "flags", flags: ["gb", "us"] },
  GER40: { type: "flags", flags: ["de"] },
  US30: { type: "icon", icon: BarChart3, bgColor: "bg-blue-100", textColor: "text-blue-600", label: "DOW" },
  NAS100: { type: "icon", icon: Cpu, bgColor: "bg-cyan-100", textColor: "text-cyan-600", label: "NDX" },
  SP500: { type: "icon", icon: TrendingUp, bgColor: "bg-amber-100", textColor: "text-amber-600", label: "SPX" },
};

export function InstrumentIcon({ code, size = "md" }: { code: string; size?: "sm" | "md" | "lg" }) {
  const config = instrumentConfig[code];
  if (!config) return null;

  // Flag pixel widths for each size
  const flagWidths = { sm: 24, md: 32, lg: 44 };
  const iconContainerSizes = { sm: 28, md: 36, lg: 48 };
  const iconInnerSizes = { sm: 14, md: 18, lg: 24 };
  const fw = flagWidths[size];
  const cs = iconContainerSizes[size];
  const is = iconInnerSizes[size];

  if (config.type === "flags" && config.flags) {
    const isSingleFlag = config.flags.length === 1;
    return (
      <div className="flex items-center" style={{ minWidth: isSingleFlag ? fw : fw + fw * 0.6 }}>
        {config.flags.map((flag, idx) => (
          <img
            key={flag}
            src={`${FLAG_URL}/w${fw * 2}/${flag}.png`}
            alt={flag.toUpperCase()}
            width={fw}
            height={Math.round(fw * 0.67)}
            className="rounded-[3px] object-cover shadow-sm ring-1 ring-gray-200"
            style={{
              marginLeft: idx > 0 ? -(fw * 0.3) : 0,
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
      className={`flex items-center justify-center rounded-lg ${config.bgColor}`}
      style={{ width: cs, height: cs }}
    >
      <Icon className={config.textColor} style={{ width: is, height: is }} />
    </div>
  );
}

export { instrumentConfig };
