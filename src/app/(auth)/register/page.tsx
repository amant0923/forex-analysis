"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-2xl font-bold text-gray-900">ForexPulse</h1>
          <p className="mt-1 text-sm text-gray-500">Create your account</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input id="name" name="name" type="text" required className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]" placeholder="Your name" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input id="email" name="email" type="email" required className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]" placeholder="you@example.com" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input id="password" name="password" type="password" required className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]" placeholder="Min 8 characters" />
            </div>
            <button type="submit" className="w-full rounded bg-[#1e3a5f] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#162d4a] transition-colors cursor-pointer">
              Create Account
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-[#1e3a5f] hover:underline cursor-pointer">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
