"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/");
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 backdrop-blur-md">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-100">Sign In</h2>
        <p className="mt-1 text-xs text-zinc-500">Access your trading dashboard</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-medium text-zinc-400">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border-white/[0.06] bg-white/[0.03] text-zinc-100 placeholder:text-zinc-600 focus:border-purple-500/30 focus:ring-purple-500/20"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs font-medium text-zinc-400">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border-white/[0.06] bg-white/[0.03] text-zinc-100 placeholder:text-zinc-600 focus:border-purple-500/30 focus:ring-purple-500/20"
            placeholder="Enter your password"
          />
        </div>
        {error && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 transition-all duration-200 shadow-lg shadow-purple-500/10"
        >
          <LogIn className="mr-2 h-4 w-4" />
          Sign In
        </Button>
      </form>
    </div>
  );
}
