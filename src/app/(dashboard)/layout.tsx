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
    <div className="relative min-h-screen overflow-hidden">
      {/* Mesh gradient blobs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_70%)]" />
        <div className="absolute -bottom-[15%] -left-[10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05),transparent_70%)]" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.06),transparent_70%)] -translate-x-1/2" />
      </div>
      {/* Content */}
      <div className="relative z-10">
        <TopNav instruments={instruments} />
        <main className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-12">{children}</main>
      </div>
    </div>
  );
}
