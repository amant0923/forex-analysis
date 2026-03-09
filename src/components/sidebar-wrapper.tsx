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
        className="fixed left-4 top-4 z-50 rounded-xl border border-gray-200 bg-white p-2 shadow-sm md:hidden cursor-pointer"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
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
          className="absolute right-3 top-5 z-50 rounded-md p-1 text-gray-400 hover:text-gray-600 md:hidden cursor-pointer"
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
