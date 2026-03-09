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
    color: "text-emerald-400",
    glow: "shadow-emerald-500/10",
    bg: "bg-emerald-500/[0.06]",
    border: "border-emerald-500/20",
  },
  bearish: {
    icon: TrendingDown,
    text: "BEARISH",
    color: "text-red-400",
    glow: "shadow-red-500/10",
    bg: "bg-red-500/[0.06]",
    border: "border-red-500/20",
  },
  neutral: {
    icon: Minus,
    text: "NEUTRAL",
    color: "text-zinc-500",
    glow: "",
    bg: "bg-white/[0.03]",
    border: "border-white/5",
  },
};

export function BiasBadge({ direction, label, size = "sm" }: BiasBadgeProps) {
  const dir = direction ?? "neutral";
  const config = directionConfig[dir];
  const Icon = config.icon;
  const isActive = dir !== "neutral";

  return (
    <div className={cn(
      "flex flex-col items-center gap-1 rounded-lg border p-2 transition-all duration-200",
      config.border,
      config.bg,
      "backdrop-blur-sm",
      size === "lg" && cn("p-4", config.glow, "shadow-lg"),
      size === "lg" && isActive && "ring-1 ring-inset",
      size === "lg" && dir === "bullish" && "ring-emerald-500/20",
      size === "lg" && dir === "bearish" && "ring-red-500/20",
    )}>
      <span className="text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </span>
      <div className={cn(
        "flex items-center gap-1",
        isActive && "animate-bias-pulse",
      )}>
        <Icon className={cn(
          config.color,
          size === "lg" ? "h-4 w-4" : "h-3 w-3",
        )} />
        <span className={cn(
          "font-bold",
          size === "lg" ? "text-lg" : "text-sm",
          config.color,
        )}>
          {config.text}
        </span>
      </div>
    </div>
  );
}
