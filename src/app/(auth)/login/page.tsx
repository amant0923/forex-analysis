import { LoginForm } from "@/components/login-form";
import { Activity } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      <div className="relative w-full max-w-md px-4">
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            ForexPulse
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-gray-400">
            Fundamental Analysis
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
