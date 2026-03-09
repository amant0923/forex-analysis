import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BiasIndicatorProps {
  direction: "bullish" | "bearish" | "neutral" | null;
  label?: string;
  size?: "sm" | "md";
}

const dirConfig = {
  bullish: {
    icon: TrendingUp,
    text: "Bullish",
    dotColor: "bg-green-700",
    textColor: "text-green-800",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  bearish: {
    icon: TrendingDown,
    text: "Bearish",
    dotColor: "bg-red-800",
    textColor: "text-red-800",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  neutral: {
    icon: Minus,
    text: "Neutral",
    dotColor: "bg-gray-400",
    textColor: "text-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
};

export function BiasIndicator({ direction, label, size = "sm" }: BiasIndicatorProps) {
  const dir = direction ?? "neutral";
  const c = dirConfig[dir];
  const Icon = c.icon;

  if (size === "sm") {
    return (
      <div className="flex items-center gap-1.5">
        {label && (
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider w-8">
            {label}
          </span>
        )}
        <div className={cn("h-2 w-2 rounded-full", c.dotColor)} />
        <span className={cn("text-xs font-semibold", c.textColor)}>{c.text}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 rounded border px-3 py-1.5", c.bgColor, c.borderColor)}>
      <Icon className={cn("h-3.5 w-3.5", c.textColor)} />
      <span className={cn("text-sm font-semibold", c.textColor)}>{c.text}</span>
      {label && <span className="text-xs text-gray-400 ml-1">{label}</span>}
    </div>
  );
}

export function BiasDirectionDot({ direction }: { direction: "bullish" | "bearish" | "neutral" | null }) {
  const dir = direction ?? "neutral";
  const c = dirConfig[dir];
  return <div className={cn("h-2.5 w-2.5 rounded-full", c.dotColor)} />;
}
