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
    <div className="min-h-screen bg-[#fafafa]">
      <TopNav instruments={instruments} />
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</main>
    </div>
  );
}
