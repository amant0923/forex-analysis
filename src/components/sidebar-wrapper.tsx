"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

export function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-lg border border-white/[0.06] bg-zinc-950/90 p-2 backdrop-blur-md md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-zinc-300" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <div
        className={`fixed left-0 top-0 z-50 h-screen w-64 transition-transform duration-300 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setOpen(false)}
          className="absolute right-3 top-5 z-50 rounded-md p-1 text-zinc-500 hover:text-zinc-300 md:hidden"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Render the server-side sidebar content */}
        <div onClick={() => setOpen(false)} className="h-full">
          {children}
        </div>
      </div>
    </>
  );
}
