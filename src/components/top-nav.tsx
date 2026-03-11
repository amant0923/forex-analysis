"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { InstrumentIcon } from "./instrument-icon";
import {
  Menu,
  X,
  LogOut,
  Newspaper,
  BookOpen,
  Calendar,
  TrendingUp,
  PlusCircle,
  BookMarked,
  Wallet,
  Bot,
  BarChart3,
  ChevronDown,
  Home,
  Settings,
} from "lucide-react";
import { signOut } from "next-auth/react";
import type { Instrument } from "@/types";

interface TopNavProps {
  instruments: Instrument[];
}

const journalLinks = [
  { href: "/journal", label: "Journal", icon: BookOpen, gradientFrom: "#a0a0a0", gradientTo: "#ffffff" },
  { href: "/journal/add", label: "Log Trade", icon: PlusCircle, gradientFrom: "#808080", gradientTo: "#d0d0d0" },
  { href: "/playbooks", label: "Playbooks", icon: BookMarked, gradientFrom: "#909090", gradientTo: "#e0e0e0" },
  { href: "/journal/accounts", label: "Accounts", icon: Wallet, gradientFrom: "#707070", gradientTo: "#b0b0b0" },
  { href: "/journal/chat", label: "AI Chat", icon: Bot, gradientFrom: "#888888", gradientTo: "#cccccc" },
  { href: "/journal/reports", label: "Reports", icon: BarChart3, gradientFrom: "#999999", gradientTo: "#e8e8e8" },
];

export function TopNav({ instruments }: TopNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const homeActive = pathname === "/";
  const newsActive =
    pathname === "/calendar" ||
    instruments.some((i) => pathname === `/${i.code}`);
  const journalActive = journalLinks.some((l) => pathname === l.href);

  return (
    <header className="sticky top-0 z-50 w-full bg-black/40 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-10">
        {/* Logo */}
        <Link href="/" className="shrink-0 cursor-pointer">
          <span className="font-serif text-lg font-bold tracking-tight text-white">
            ForexPulse
          </span>
        </Link>

        <div className="hidden sm:block h-5 w-px bg-white/10 shrink-0 mx-4" />

        {/* Desktop nav — two dropdown sections */}
        <nav className="hidden sm:flex items-center gap-1 flex-1">
          {/* Home */}
          <Link
            href="/"
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
              homeActive
                ? "text-white bg-white/10"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Home className="h-4 w-4" />
            Home
          </Link>

          {/* News Dropdown */}
          <div className="relative group/news">
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                newsActive
                  ? "text-white bg-white/10"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Newspaper className="h-4 w-4" />
              News
              <ChevronDown className="h-3 w-3 transition-transform duration-200 group-hover/news:rotate-180" />
            </button>

            {/* Dropdown */}
            <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover/news:opacity-100 group-hover/news:visible transition-all duration-200 z-50">
              <div className="bg-black/80 backdrop-blur-2xl border border-white/[0.1] rounded-2xl p-3 shadow-[0_16px_64px_rgba(0,0,0,0.5)] min-w-[320px]">
                {/* Instruments grid */}
                <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold px-2 mb-2">
                  Instruments
                </p>
                <div className="grid grid-cols-2 gap-1 mb-2">
                  {instruments.map((inst) => {
                    const isActive = pathname === `/${inst.code}`;
                    return (
                      <Link
                        key={inst.code}
                        href={`/${inst.code}`}
                        style={
                          { "--gradient-from": "#606060", "--gradient-to": "#ffffff" } as React.CSSProperties
                        }
                        className={cn(
                          "relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer group/item overflow-hidden",
                          isActive
                            ? "bg-white/10 text-white"
                            : "text-gray-400 hover:text-white"
                        )}
                      >
                        {/* Gradient bg on hover */}
                        <span className="absolute inset-0 rounded-xl bg-[linear-gradient(135deg,var(--gradient-from),var(--gradient-to))] opacity-0 transition-opacity duration-300 group-hover/item:opacity-[0.12]" />
                        {/* Glow */}
                        <span className="absolute inset-x-2 bottom-0 h-[60%] rounded-xl bg-[linear-gradient(135deg,var(--gradient-from),var(--gradient-to))] blur-[12px] opacity-0 -z-10 transition-opacity duration-300 group-hover/item:opacity-20" />
                        <span className="relative z-10 shrink-0">
                          <InstrumentIcon code={inst.code} size="sm" />
                        </span>
                        <span className="relative z-10 flex flex-col">
                          <span className="text-[13px] font-semibold">{inst.code}</span>
                          <span className="text-[10px] text-white/30 group-hover/item:text-white/50 transition-colors">{inst.name}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>

                {/* Calendar */}
                <div className="border-t border-white/[0.06] pt-2">
                  <Link
                    href="/calendar"
                    style={
                      { "--gradient-from": "#808080", "--gradient-to": "#d0d0d0" } as React.CSSProperties
                    }
                    className={cn(
                      "relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer group/item overflow-hidden",
                      pathname === "/calendar"
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:text-white"
                    )}
                  >
                    <span className="absolute inset-0 rounded-xl bg-[linear-gradient(135deg,var(--gradient-from),var(--gradient-to))] opacity-0 transition-opacity duration-300 group-hover/item:opacity-[0.12]" />
                    <span className="absolute inset-x-2 bottom-0 h-[60%] rounded-xl bg-[linear-gradient(135deg,var(--gradient-from),var(--gradient-to))] blur-[12px] opacity-0 -z-10 transition-opacity duration-300 group-hover/item:opacity-20" />
                    <Calendar className="h-4 w-4 relative z-10" />
                    <span className="relative z-10">Economic Calendar</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Journal Dropdown */}
          <div className="relative group/journal">
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                journalActive
                  ? "text-white bg-white/10"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <BookOpen className="h-4 w-4" />
              Journal
              <ChevronDown className="h-3 w-3 transition-transform duration-200 group-hover/journal:rotate-180" />
            </button>

            {/* Dropdown */}
            <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover/journal:opacity-100 group-hover/journal:visible transition-all duration-200 z-50">
              <div className="bg-black/80 backdrop-blur-2xl border border-white/[0.1] rounded-2xl p-3 shadow-[0_16px_64px_rgba(0,0,0,0.5)] min-w-[240px]">
                <div className="space-y-1">
                  {journalLinks.map((link) => {
                    const isActive = pathname === link.href;
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        style={
                          {
                            "--gradient-from": link.gradientFrom,
                            "--gradient-to": link.gradientTo,
                          } as React.CSSProperties
                        }
                        className={cn(
                          "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer group/item overflow-hidden",
                          isActive
                            ? "bg-white/10 text-white"
                            : "text-gray-400 hover:text-white"
                        )}
                      >
                        {/* Gradient bg on hover */}
                        <span className="absolute inset-0 rounded-xl bg-[linear-gradient(135deg,var(--gradient-from),var(--gradient-to))] opacity-0 transition-opacity duration-300 group-hover/item:opacity-[0.12]" />
                        {/* Glow */}
                        <span className="absolute inset-x-2 bottom-0 h-[60%] rounded-xl bg-[linear-gradient(135deg,var(--gradient-from),var(--gradient-to))] blur-[12px] opacity-0 -z-10 transition-opacity duration-300 group-hover/item:opacity-20" />
                        <Icon className="h-4 w-4 relative z-10" />
                        <span className="relative z-10">{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Right side */}
        <div className="hidden sm:flex items-center gap-2 shrink-0 ml-2">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
              pathname === "/settings"
                ? "text-white bg-white/10"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
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
        <nav className="sm:hidden bg-black/80 backdrop-blur-xl border-t border-white/[0.06] px-4 py-3 space-y-1">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
              homeActive
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>

          <div className="h-px bg-white/10 my-2" />

          <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold px-3 mb-1">
            News
          </p>
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
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <InstrumentIcon code={inst.code} size="sm" />
                <span>{inst.code}</span>
                <span className="text-xs text-gray-500 ml-auto">{inst.name}</span>
              </Link>
            );
          })}
          <Link
            href="/calendar"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
              pathname === "/calendar"
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Calendar className="h-4 w-4" />
            <span>Economic Calendar</span>
          </Link>

          <div className="h-px bg-white/10 my-2" />

          <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold px-3 mb-1">
            Journal
          </p>
          {journalLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                  pathname === link.href
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="h-px bg-white/10 my-2" />
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
              pathname === "/settings"
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Link>
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
