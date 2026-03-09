"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { InstrumentIcon } from "./instrument-icon";
import type { Instrument } from "@/types";

interface TopNavProps {
  instruments: Instrument[];
}

export function TopNav({ instruments }: TopNavProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-6 px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">ForexPulse</span>
        </Link>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200 hidden sm:block" />

        {/* Instrument tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {instruments.map((inst) => {
            const isActive = pathname === `/${inst.code}`;
            return (
              <Link
                key={inst.code}
                href={`/${inst.code}`}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-150 cursor-pointer",
                  isActive
                    ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800",
                )}
              >
                <InstrumentIcon code={inst.code} size="sm" />
                <span>{inst.code}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
