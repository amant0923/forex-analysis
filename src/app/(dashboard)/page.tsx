import { getInstrumentsWithBiases, getUpcomingEconomicEvents } from "@/lib/queries";
import { DashboardClient } from "@/components/dashboard-client";
import { UpcomingEvents } from "@/components/upcoming-events";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [instruments, upcomingEvents] = await Promise.all([
    getInstrumentsWithBiases(),
    getUpcomingEconomicEvents(7),
  ]);

  return (
    <>
      <UpcomingEvents events={upcomingEvents} />
      <DashboardClient instruments={instruments} />
    </>
  );
}
