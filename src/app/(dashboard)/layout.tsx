import { Sidebar } from "@/components/sidebar";
import { SidebarWrapper } from "@/components/sidebar-wrapper";
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
      <SidebarWrapper>
        <Sidebar instruments={instruments} />
      </SidebarWrapper>
      <main className="p-5 pt-16 md:ml-64 md:p-8 md:pt-8">{children}</main>
    </div>
  );
}
