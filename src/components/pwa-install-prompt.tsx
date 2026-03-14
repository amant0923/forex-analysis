"use client";

import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem("pwa-dismissed")) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem("pwa-dismissed", "1");
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[360px] z-50 animate-[fadeSlideIn_0.3s_ease-out]">
      <div className="bg-black/90 backdrop-blur-xl border border-white/[0.1] rounded-2xl p-4 shadow-[0_16px_64px_rgba(0,0,0,0.5)]">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Download className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Install Tradeora</p>
            <p className="text-xs text-white/40 mt-0.5">
              Add to your home screen for quick access to daily bias updates
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 p-1 text-white/30 hover:text-white/60 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleInstall}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors cursor-pointer"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white/40 hover:text-white/60 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
