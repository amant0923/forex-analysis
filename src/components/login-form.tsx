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
    <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200/60">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Sign In</h2>
        <p className="mt-1 text-xs text-gray-500">Access your trading dashboard</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-medium text-gray-600">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-indigo-300 focus:ring-indigo-200"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs font-medium text-gray-600">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-indigo-300 focus:ring-indigo-200"
            placeholder="Enter your password"
          />
        </div>
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-200">
            {error}
          </div>
        )}
        <Button
          type="submit"
          className="w-full cursor-pointer bg-indigo-600 text-white hover:bg-indigo-500 transition-all duration-200 shadow-sm"
        >
          <LogIn className="mr-2 h-4 w-4" />
          Sign In
        </Button>
      </form>
    </div>
  );
}
