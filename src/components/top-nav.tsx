"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { InstrumentIcon } from "./instrument-icon";
import { Menu, X, Calendar, BookOpen, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
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
        <Link href="/" className="shrink-0 cursor-pointer">
          <span className="font-serif text-lg font-bold tracking-tight text-white">
            ForexPulse
          </span>
        </Link>

        <div className="hidden sm:block h-4 w-px bg-gray-600 shrink-0" />

        {/* Desktop nav — single scrollable row */}
        <nav className="hidden sm:flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0 scrollbar-hide">
          {instruments.map((inst) => {
            const isActive = pathname === `/${inst.code}`;
            return (
              <Link
                key={inst.code}
                href={`/${inst.code}`}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-[12px] font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer",
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

          <div className="h-4 w-px bg-gray-600 shrink-0 mx-1" />

          <Link
            href="/calendar"
            className={cn(
              "flex items-center px-2 py-1 rounded text-[12px] font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer",
              pathname === "/calendar"
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5",
            )}
          >
            Calendar
          </Link>

          <div className="h-4 w-px bg-gray-600 shrink-0 mx-1" />

          {[
            { href: "/journal", label: "Journal" },
            { href: "/journal/add", label: "Log Trade" },
            { href: "/playbooks", label: "Playbooks" },
            { href: "/journal/accounts", label: "Accounts" },
            { href: "/journal/chat", label: "AI Chat" },
            { href: "/journal/reports", label: "Reports" },
          ].map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-[12px] font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5",
                )}
              >
                {link.href === "/journal" && <BookOpen className="h-3.5 w-3.5" />}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden sm:flex items-center gap-2 shrink-0 ml-2">
          <span className="hidden lg:block text-xs text-gray-500 font-medium">
            {today}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1 px-2 py-1 rounded text-[12px] font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>

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
          <div className="h-px bg-gray-700 my-2" />
          {[
            { href: "/journal", label: "Journal" },
            { href: "/journal/add", label: "Log Trade" },
            { href: "/playbooks", label: "Playbooks" },
            { href: "/journal/accounts", label: "Accounts" },
            { href: "/journal/chat", label: "AI Chat" },
            { href: "/journal/reports", label: "Reports" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                pathname === link.href
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5",
              )}
            >
              {link.href === "/journal" && <BookOpen className="h-4 w-4" />}
              <span>{link.label}</span>
            </Link>
          ))}
          <div className="h-px bg-gray-700 my-2" />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer w-full"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </nav>
      )}
    </header>
  );
}
