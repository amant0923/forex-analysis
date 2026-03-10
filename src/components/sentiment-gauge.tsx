import { cn } from "@/lib/utils";

interface SentimentGaugeProps {
  score: number;
  size?: "sm" | "md";
  showLabel?: boolean;
}

function getLabel(score: number): string {
  if (score <= 20) return "Extreme Fear";
  if (score <= 40) return "Fear";
  if (score <= 60) return "Neutral";
  if (score <= 80) return "Greed";
  return "Extreme Greed";
}

function getColor(score: number): string {
  if (score <= 20) return "bg-red-600";
  if (score <= 40) return "bg-orange-500";
  if (score <= 60) return "bg-yellow-500";
  if (score <= 80) return "bg-green-500";
  return "bg-green-600";
}

function getTextColor(score: number): string {
  if (score <= 20) return "text-red-600";
  if (score <= 40) return "text-orange-500";
  if (score <= 60) return "text-yellow-600";
  if (score <= 80) return "text-green-600";
  return "text-green-700";
}

export function SentimentGauge({ score, size = "sm", showLabel = true }: SentimentGaugeProps) {
  const h = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className="flex items-center gap-2">
      <div className={cn("flex-1 rounded-full bg-gray-100 overflow-hidden", h)}>
        <div
          className={cn("h-full rounded-full transition-all", getColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={cn(
        "font-semibold tabular-nums shrink-0",
        getTextColor(score),
        size === "sm" ? "text-[10px]" : "text-xs"
      )}>
        {score}
      </span>
      {showLabel && size === "md" && (
        <span className={cn("text-xs font-medium", getTextColor(score))}>
          {getLabel(score)}
        </span>
      )}
    </div>
  );
}

export function SentimentLabel({ score }: { score: number }) {
  return (
    <span className={cn("text-xs font-semibold", getTextColor(score))}>
      {getLabel(score)}
    </span>
  );
}
