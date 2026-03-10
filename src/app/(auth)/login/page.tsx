"use client";

import { useState, useEffect } from "react";
import { LoginForm } from "@/components/login-form";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { SpiralAnimation } from "@/components/ui/spiral-animation";
import Link from "next/link";

export default function LoginPage() {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-[#09090b]">
      {/* Spiral Animation Background */}
      <div className="absolute inset-0">
        <SpiralAnimation />
      </div>

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/80 via-transparent to-[#09090b]/40 pointer-events-none" />

      {/* Content */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center z-10 px-4 transition-all duration-[2000ms] ease-out ${
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        {/* Brand */}
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-white tracking-tight drop-shadow-[0_0_40px_rgba(255,255,255,0.15)]">
            ForexPulse
          </h1>
          <p className="mt-2 text-sm text-white/40 tracking-[0.2em] uppercase font-light">
            Fundamental Analysis Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-sm">
          <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2">
            <GlowingEffect
              spread={60}
              glow
              proximity={80}
              inactiveZone={0.01}
              borderWidth={3}
              disabled={false}
            />
            <div className="glass rounded-xl p-8">
              <LoginForm />
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-white/30">
            No account?{" "}
            <Link
              href="/register"
              className="text-white/80 hover:underline cursor-pointer"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
