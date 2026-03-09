import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BiasBadgeProps {
  direction: "bullish" | "bearish" | "neutral" | null;
  label: string;
  size?: "sm" | "lg";
}

const directionConfig = {
  bullish: {
    icon: TrendingUp,
    text: "BULLISH",
    color: "text-emerald-300",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
    glow: "shadow-emerald-500/20",
    ring: "ring-emerald-500/30",
    gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
  },
  bearish: {
    icon: TrendingDown,
    text: "BEARISH",
    color: "text-red-300",
    bg: "bg-red-500/15",
    border: "border-red-500/30",
    glow: "shadow-red-500/20",
    ring: "ring-red-500/30",
    gradient: "from-red-500/20 via-red-500/10 to-transparent",
  },
  neutral: {
    icon: Minus,
    text: "NEUTRAL",
    color: "text-zinc-400",
    bg: "bg-white/[0.04]",
    border: "border-white/10",
    glow: "",
    ring: "ring-white/10",
    gradient: "from-zinc-500/10 via-zinc-500/5 to-transparent",
  },
};

export function BiasBadge({ direction, label, size = "sm" }: BiasBadgeProps) {
  const dir = direction ?? "neutral";
  const config = directionConfig[dir];
  const Icon = config.icon;
  const isActive = dir !== "neutral";

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-1.5 overflow-hidden rounded-xl border p-2.5 transition-all duration-300",
        config.border,
        config.bg,
        "backdrop-blur-sm",
        size === "lg" && "p-5 shadow-lg ring-1 ring-inset",
        size === "lg" && config.glow,
        size === "lg" && config.ring
      )}
    >
      {/* Gradient overlay */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-b opacity-60",
          config.gradient
        )}
      />

      <span
        className={cn(
          "relative text-[10px] font-semibold uppercase tracking-widest",
          isActive ? "text-zinc-400" : "text-zinc-500"
        )}
      >
        {label}
      </span>
      <div
        className={cn(
          "relative flex items-center gap-1.5",
          isActive && "animate-bias-pulse"
        )}
      >
        <Icon
          className={cn(
            config.color,
            size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5"
          )}
        />
        <span
          className={cn(
            "font-bold tracking-wide",
            size === "lg" ? "text-lg" : "text-sm",
            config.color
          )}
        >
          {config.text}
        </span>
      </div>
    </div>
  );
}
