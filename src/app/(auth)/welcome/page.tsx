"use client";

import { useState, useEffect } from "react";
import { SpiralAnimation } from "@/components/ui/spiral-animation";

export default function WelcomePage() {
  const [phase, setPhase] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    const timer = setTimeout(() => setPhase("ready"), 3000);
    return () => clearTimeout(timer);
  }, []);

  async function handleEnter() {
    try {
      const res = await fetch("/api/auth/session");
      const session = await res.json();
      if (session?.user) {
        window.location.href = "/";
      } else {
        window.location.href = "/login";
      }
    } catch {
      window.location.href = "/login";
    }
  }

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-[#09090b]">
      {/* Spiral Animation Background */}
      <div className="absolute inset-0">
        <SpiralAnimation />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/80 via-transparent to-[#09090b]/40 pointer-events-none" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center z-10 pt-[12vh] sm:pt-[15vh]">
        {/* Brand — always visible with fade in */}
        <div className="text-center mb-16 animate-[fadeSlideIn_2s_ease-out_forwards]">
          <h1 className="font-serif text-5xl sm:text-6xl font-bold text-white tracking-tight drop-shadow-[0_0_40px_rgba(255,255,255,0.15)]">
            Tradeora
          </h1>
          <p className="mt-3 text-sm text-white/40 tracking-[0.2em] uppercase font-light">
            Fundamental Analysis
          </p>
        </div>

        {/* Welcome button — appears after 3s */}
        <button
          onClick={handleEnter}
          disabled={phase === "loading"}
          className={`transition-all duration-1000 ease-out cursor-pointer ${
            phase === "ready"
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <span className="text-white text-2xl tracking-[0.25em] uppercase font-extralight hover:tracking-[0.35em] transition-all duration-700 animate-pulse">
            Welcome
          </span>
        </button>
      </div>
    </div>
  );
}
