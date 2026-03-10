"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);

    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1">Email</label>
        <input id="email" name="email" type="email" required className="w-full rounded border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/25 focus:outline-none focus:ring-1 focus:ring-white/25" placeholder="you@example.com" />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-1">Password</label>
        <input id="password" name="password" type="password" required className="w-full rounded border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/25 focus:outline-none focus:ring-1 focus:ring-white/25" placeholder="Your password" />
      </div>
      <button type="submit" className="w-full rounded bg-white/[0.15] border border-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-colors cursor-pointer">
        Sign In
      </button>
    </form>
  );
}
