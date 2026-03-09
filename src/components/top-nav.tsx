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
    <header className="sticky top-0 z-50 w-full border-b border-gray-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-6 lg:px-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 cursor-pointer">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-sm">
            <Activity className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-gray-900">ForexPulse</span>
        </Link>

        {/* Divider */}
        <div className="h-5 w-px bg-gray-200 hidden sm:block" />

        {/* Instrument tabs */}
        <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          {instruments.map((inst) => {
            const isActive = pathname === `/${inst.code}`;
            return (
              <Link
                key={inst.code}
                href={`/${inst.code}`}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-all duration-150 cursor-pointer",
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700",
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
