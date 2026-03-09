import { LoginForm } from "@/components/login-form";
import { Activity } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-950">
      {/* Background gradient pattern */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[40%] left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-purple-500/[0.04] blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] h-[400px] w-[400px] rounded-full bg-blue-500/[0.04] blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md px-4">
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20">
            <Activity className="h-6 w-6 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            ForexPulse
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-600">
            Fundamental Analysis
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
