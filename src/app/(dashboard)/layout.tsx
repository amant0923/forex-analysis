import { Sidebar } from "@/components/sidebar";
import { getInstruments } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const instruments = await getInstruments();
  return (
    <div className="min-h-screen bg-zinc-950">
      <Sidebar instruments={instruments} />
      <main className="ml-64 p-8">{children}</main>
    </div>
  );
}
