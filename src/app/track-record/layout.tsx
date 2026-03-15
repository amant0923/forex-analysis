import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Track Record — Tradeora",
  description: "Transparent AI bias prediction accuracy for forex and CFD instruments",
};

export default function TrackRecordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Mesh gradient blobs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_70%)]" />
        <div className="absolute -bottom-[15%] -left-[10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05),transparent_70%)]" />
      </div>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-black/40 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link href="/" className="shrink-0">
            <span className="font-serif text-lg font-bold tracking-tight text-white">Tradeora</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
        <div className="h-[2px] bg-[#2563eb]" />
      </header>
      {/* Content */}
      <div className="relative z-10">
        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
