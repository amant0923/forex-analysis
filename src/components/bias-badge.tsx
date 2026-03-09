import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BiasBadgeProps {
  direction: "bullish" | "bearish" | "neutral" | null;
  label: string;
  size?: "sm" | "lg";
}

const config = {
  bullish: {
    icon: TrendingUp,
    text: "BULLISH",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    color: "text-emerald-600",
    iconColor: "text-emerald-500",
    ringColor: "ring-emerald-300",
  },
  bearish: {
    icon: TrendingDown,
    text: "BEARISH",
    bg: "bg-red-50",
    border: "border-red-200",
    color: "text-red-600",
    iconColor: "text-red-500",
    ringColor: "ring-red-300",
  },
  neutral: {
    icon: Minus,
    text: "NEUTRAL",
    bg: "bg-gray-50",
    border: "border-gray-200",
    color: "text-gray-500",
    iconColor: "text-gray-400",
    ringColor: "ring-gray-300",
  },
};

export function BiasBadge({ direction, label, size = "sm" }: BiasBadgeProps) {
  const dir = direction ?? "neutral";
  const c = config[dir];
  const Icon = c.icon;

  return (
    <div className={cn(
      "flex flex-col items-center gap-1 rounded-xl border p-2 transition-all",
      c.bg, c.border,
      size === "lg" && "p-3 shadow-sm ring-1",
      size === "lg" && c.ringColor,
    )}>
      <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <Icon className={cn(c.iconColor, size === "lg" ? "h-4 w-4" : "h-3 w-3")} />
        <span className={cn("font-semibold", c.color, size === "lg" ? "text-sm" : "text-xs")}>
          {c.text}
        </span>
      </div>
    </div>
  );
}
