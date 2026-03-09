import { LoginForm } from "@/components/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-2xl font-bold text-gray-900">ForexPulse</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <LoginForm />
        </div>

        <p className="mt-4 text-center text-sm text-gray-400">
          No account?{" "}
          <Link href="/register" className="text-[#1e3a5f] hover:underline cursor-pointer">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
