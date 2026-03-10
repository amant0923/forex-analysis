import { TradeForm } from "@/components/trade-form";

export const dynamic = "force-dynamic";

export default function AddTradePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Log Trade</h1>
      <TradeForm />
    </div>
  );
}
