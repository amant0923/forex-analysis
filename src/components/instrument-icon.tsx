import { BarChart3, Cpu, TrendingUp } from "lucide-react";

const FLAG_URL = "https://flagcdn.com/w40";

const instrumentConfig: Record<string, { type: "flags" | "icon"; flags?: string[]; icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; bgColor?: string; textColor?: string; label?: string }> = {
  DXY: { type: "flags", flags: ["us"] },
  EURUSD: { type: "flags", flags: ["eu", "us"] },
  GBPUSD: { type: "flags", flags: ["gb", "us"] },
  GER40: { type: "flags", flags: ["de"] },
  US30: { type: "icon", icon: BarChart3, bgColor: "bg-blue-50", textColor: "text-blue-600", label: "DOW" },
  NAS100: { type: "icon", icon: Cpu, bgColor: "bg-cyan-50", textColor: "text-cyan-600", label: "NDX" },
  SP500: { type: "icon", icon: TrendingUp, bgColor: "bg-amber-50", textColor: "text-amber-600", label: "SPX" },
};

export function InstrumentIcon({ code, size = "md" }: { code: string; size?: "sm" | "md" | "lg" }) {
  const config = instrumentConfig[code];
  const flagSizes = { sm: 20, md: 28, lg: 40 };
  const iconSizes = { sm: 32, md: 40, lg: 56 };
  const s = flagSizes[size];
  const is = iconSizes[size];

  if (!config) return null;

  if (config.type === "flags") {
    return (
      <div className="flex items-center -space-x-1">
        {config.flags!.map((flag) => (
          <img
            key={flag}
            src={`${FLAG_URL}/${flag}.png`}
            alt={flag.toUpperCase()}
            width={s}
            height={Math.round(s * 0.75)}
            className="rounded shadow-sm ring-2 ring-white"
          />
        ))}
      </div>
    );
  }

  const Icon = config.icon!;
  return (
    <div className={`flex items-center justify-center rounded-xl ${config.bgColor}`}
         style={{ width: is, height: is }}>
      <Icon className={`${config.textColor}`} style={{ width: is * 0.5, height: is * 0.5 }} />
    </div>
  );
}

export { instrumentConfig };
