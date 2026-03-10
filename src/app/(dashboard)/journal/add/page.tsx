"use client";

import { useSearchParams } from "next/navigation";
import { TradeForm } from "@/components/trade-form";

export default function AddTradePage() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const tradeId = editId ? Number(editId) : undefined;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">
        {tradeId ? "Edit Trade" : "Log Trade"}
      </h1>
      <TradeForm tradeId={tradeId} />
    </div>
  );
}
