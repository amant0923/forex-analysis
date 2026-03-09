import { TopNav } from "@/components/top-nav";
import { getInstruments } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const instruments = await getInstruments();
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <TopNav instruments={instruments} />
      <main className="px-6 py-6">{children}</main>
    </div>
  );
}
