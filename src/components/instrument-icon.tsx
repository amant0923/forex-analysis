import { BarChart3, Cpu, TrendingUp } from "lucide-react";

const FLAG_URL = "https://flagcdn.com/w40";

const instrumentConfig: Record<
  string,
  {
    type: "flags" | "icon";
    flags?: string[];
    icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    color?: string;
    label?: string;
    bgColor?: string;
  }
> = {
  DXY: { type: "flags", flags: ["us"] },
  EURUSD: { type: "flags", flags: ["eu", "us"] },
  GBPUSD: { type: "flags", flags: ["gb", "us"] },
  GER40: { type: "flags", flags: ["de"] },
  US30: {
    type: "icon",
    icon: BarChart3,
    color: "text-blue-400",
    label: "DOW",
    bgColor: "from-blue-500/20 to-blue-600/10",
  },
  NAS100: {
    type: "icon",
    icon: Cpu,
    color: "text-cyan-400",
    label: "NDX",
    bgColor: "from-cyan-500/20 to-cyan-600/10",
  },
  SP500: {
    type: "icon",
    icon: TrendingUp,
    color: "text-amber-400",
    label: "SPX",
    bgColor: "from-amber-500/20 to-amber-600/10",
  },
};

export function InstrumentIcon({
  code,
  size = "md",
}: {
  code: string;
  size?: "sm" | "md" | "lg";
}) {
  const config = instrumentConfig[code];
  const sizes = { sm: 24, md: 32, lg: 48 };
  const s = sizes[size];

  if (!config) return null;

  if (config.type === "flags") {
    return (
      <div className="flex items-center -space-x-1.5">
        {config.flags!.map((flag) => (
          <img
            key={flag}
            src={`${FLAG_URL}/${flag}.png`}
            alt={flag.toUpperCase()}
            width={s}
            height={Math.round(s * 0.75)}
            className="rounded-sm border border-white/10 shadow-sm"
          />
        ))}
      </div>
    );
  }

  const Icon = config.icon!;
  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-gradient-to-br ${config.bgColor} border border-white/10`}
      style={{ width: s + 12, height: s + 12 }}
    >
      <Icon
        className={config.color}
        style={{ width: s * 0.6, height: s * 0.6 }}
      />
    </div>
  );
}

export { instrumentConfig };
