"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GlowingEffect } from "@/components/ui/glowing-effect";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });

    if (res.ok) {
      router.push("/login");
    } else {
      const data = await res.json();
      setError(data.error || "Registration failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_70%)]" />
        <div className="absolute -bottom-[15%] -left-[10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05),transparent_70%)]" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.06),transparent_70%)] -translate-x-1/2" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-2xl font-bold text-white">Tradeora</h1>
          <p className="mt-1 text-sm text-white/40">Create your account</p>
        </div>

        <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2">
          <GlowingEffect spread={60} glow proximity={80} inactiveZone={0.01} borderWidth={3} disabled={false} />
          <div className="glass rounded-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {error}
                </p>
              )}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-white/80 mb-1">Name</label>
                <input id="name" name="name" type="text" required className="w-full rounded border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/25 focus:outline-none focus:ring-1 focus:ring-white/25" placeholder="Your name" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1">Email</label>
                <input id="email" name="email" type="email" required className="w-full rounded border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/25 focus:outline-none focus:ring-1 focus:ring-white/25" placeholder="you@example.com" />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-1">Password</label>
                <input id="password" name="password" type="password" required className="w-full rounded border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/25 focus:outline-none focus:ring-1 focus:ring-white/25" placeholder="Min 8 characters" />
              </div>
              <button type="submit" className="w-full rounded bg-white/[0.15] border border-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-colors cursor-pointer">
                Create Account
              </button>
            </form>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-white/30">
          Already have an account?{" "}
          <Link href="/login" className="text-white/80 hover:underline cursor-pointer">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
