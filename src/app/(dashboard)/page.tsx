import { getInstrumentsWithBiases } from "@/lib/queries";
import { DashboardClient } from "@/components/dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const instruments = await getInstrumentsWithBiases();

  return <DashboardClient instruments={instruments} />;
}
