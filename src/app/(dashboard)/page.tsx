import { getInstrumentsWithBiases } from "@/lib/queries";
import { Dashboard } from "@/components/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const instruments = await getInstrumentsWithBiases();
  return <Dashboard instruments={instruments} />;
}
