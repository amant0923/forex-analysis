import { cn } from "@/lib/utils";

interface BiasBadgeProps {
  direction: "bullish" | "bearish" | "neutral" | null;
  label: string;
  size?: "sm" | "lg";
}

export function BiasBadge({ direction, label, size = "sm" }: BiasBadgeProps) {
  const dir = direction ?? "neutral";
  return (
    <div className={cn(
      "flex flex-col items-center gap-1 rounded-lg border border-white/5 p-2",
      "bg-white/[0.03] backdrop-blur-sm",
      size === "lg" && "p-4 border-white/10 bg-white/[0.05]",
    )}>
      <span className="text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </span>
      <span className={cn(
        "font-bold",
        size === "lg" ? "text-lg" : "text-sm",
        dir === "bullish" && "text-emerald-400",
        dir === "bearish" && "text-red-400",
        dir === "neutral" && "text-zinc-500",
      )}>
        {dir === "bullish" ? "BULLISH" : dir === "bearish" ? "BEARISH" : "NEUTRAL"}
      </span>
    </div>
  );
}
