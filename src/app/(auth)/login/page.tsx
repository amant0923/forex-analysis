import { LoginForm } from "@/components/login-form";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_70%)]" />
        <div className="absolute -bottom-[15%] -left-[10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05),transparent_70%)]" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.06),transparent_70%)] -translate-x-1/2" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-2xl font-bold text-white">ForexPulse</h1>
          <p className="mt-1 text-sm text-white/40">Sign in to your account</p>
        </div>

        <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2">
          <GlowingEffect spread={60} glow proximity={80} inactiveZone={0.01} borderWidth={3} disabled={false} />
          <div className="glass rounded-xl p-8">
            <LoginForm />
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-white/30">
          No account?{" "}
          <Link href="/register" className="text-white/80 hover:underline cursor-pointer">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
