"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { InstrumentIcon } from "./instrument-icon";
import type { Instrument } from "@/types";

interface TopNavProps {
  instruments: Instrument[];
}

export function TopNav({ instruments }: TopNavProps) {
  const pathname = usePathname();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-12 max-w-[1400px] items-center justify-between px-6 lg:px-10">
        <div className="flex items-center gap-6">
          <Link href="/" className="shrink-0 cursor-pointer">
            <span className="font-serif text-lg font-bold tracking-tight text-[#1e3a5f]">
              ForexPulse
            </span>
          </Link>

          <div className="hidden sm:block h-4 w-px bg-gray-300" />

          <nav className="hidden sm:flex items-center gap-0.5 overflow-x-auto">
            {instruments.map((inst) => {
              const isActive = pathname === `/${inst.code}`;
              return (
                <Link
                  key={inst.code}
                  href={`/${inst.code}`}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer border-b-2",
                    isActive
                      ? "border-[#1e3a5f] text-[#1e3a5f]"
                      : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300",
                  )}
                >
                  <InstrumentIcon code={inst.code} size="sm" />
                  {inst.code}
                </Link>
              );
            })}
          </nav>
        </div>

        <span className="hidden md:block text-xs text-gray-400 font-medium">
          {today}
        </span>
      </div>
    </header>
  );
}
