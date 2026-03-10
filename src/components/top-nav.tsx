"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { InstrumentIcon } from "./instrument-icon";
import { Menu, X, Calendar } from "lucide-react";
import type { Instrument } from "@/types";

interface TopNavProps {
  instruments: Instrument[];
}

export function TopNav({ instruments }: TopNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="sticky top-0 z-50 w-full bg-[#1a1f2e] border-b border-[#2a3040]">
      <div className="mx-auto flex h-12 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
          <Link href="/" className="shrink-0 cursor-pointer">
            <span className="font-serif text-lg font-bold tracking-tight text-white">
              ForexPulse
            </span>
          </Link>

          <div className="hidden sm:block h-4 w-px bg-gray-600" />

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-0.5 overflow-x-auto">
            {instruments.map((inst) => {
              const isActive = pathname === `/${inst.code}`;
              return (
                <Link
                  key={inst.code}
                  href={`/${inst.code}`}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded text-[13px] font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer",
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/5",
                  )}
                >
                  <InstrumentIcon code={inst.code} size="sm" />
                  {inst.code}
                </Link>
              );
            })}
          </nav>

          <div className="hidden sm:block h-4 w-px bg-gray-600" />

          <Link
            href="/calendar"
            className={cn(
              "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded text-[13px] font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer",
              pathname === "/calendar"
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5",
            )}
          >
            Calendar
          </Link>
        </div>

        <span className="hidden md:block text-xs text-gray-500 font-medium shrink-0">
          {today}
        </span>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="sm:hidden p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Accent line */}
      <div className="h-[2px] bg-[#2563eb]" />

      {/* Mobile drawer */}
      {mobileOpen && (
        <nav className="sm:hidden bg-[#1a1f2e] border-t border-[#2a3040] px-4 py-3 space-y-1">
          {instruments.map((inst) => {
            const isActive = pathname === `/${inst.code}`;
            return (
              <Link
                key={inst.code}
                href={`/${inst.code}`}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5",
                )}
              >
                <InstrumentIcon code={inst.code} size="sm" />
                <span>{inst.code}</span>
                <span className="text-xs text-gray-500 ml-auto">{inst.name}</span>
              </Link>
            );
          })}
          <div className="h-px bg-gray-700 my-2" />
          <Link
            href="/calendar"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
              pathname === "/calendar"
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5",
            )}
          >
            <Calendar className="h-4 w-4" />
            <span>Economic Calendar</span>
          </Link>
        </nav>
      )}
    </header>
  );
}
