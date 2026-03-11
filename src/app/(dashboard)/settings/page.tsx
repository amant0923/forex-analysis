"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { InstrumentIcon } from "@/components/instrument-icon";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import {
  MessageCircle,
  Check,
  Copy,
  Loader2,
  Unlink,
  Send,
  Filter,
} from "lucide-react";

const ALL_INSTRUMENTS = ["DXY", "EURUSD", "GBPUSD", "GER40", "US30", "NAS100", "SP500"];

const CONFIDENCE_LEVELS = [
  { value: "high", label: "High Impact", color: "text-red-400", bg: "bg-red-500/15 border-red-500/20", activeBg: "bg-red-500/20 border-red-500/30" },
  { value: "medium", label: "Medium Impact", color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/20", activeBg: "bg-yellow-500/20 border-yellow-500/30" },
  { value: "low", label: "Low Impact", color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/20", activeBg: "bg-blue-500/20 border-blue-500/30" },
];

export default function SettingsPage() {
  const [connected, setConnected] = useState(false);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [confidenceFilter, setConfidenceFilter] = useState<string[]>(["high", "medium", "low"]);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testSent, setTestSent] = useState(false);

  // Load current state
  useEffect(() => {
    fetch("/api/settings/telegram")
      .then((r) => r.json())
      .then((data) => {
        setConnected(data.connected);
        setInstruments(data.instruments || []);
        setConfidenceFilter(data.confidenceFilter || ["high", "medium", "low"]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Poll for connection while code is shown
  useEffect(() => {
    if (!linkCode || connected) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/settings/telegram");
        const data = await res.json();
        if (data.connected) {
          setConnected(true);
          setInstruments(data.instruments || []);
          setConfidenceFilter(data.confidenceFilter || ["high", "medium", "low"]);
          setLinkCode(null);
          setExpiresAt(null);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(poll);
  }, [linkCode, connected]);

  // Countdown timer for link code
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        setLinkCode(null);
        setExpiresAt(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  async function generateCode() {
    setGenerating(true);
    try {
      const res = await fetch("/api/telegram/generate-code", { method: "POST" });
      const data = await res.json();
      setLinkCode(data.code);
      setExpiresAt(data.expires_at);
    } catch {
    } finally {
      setGenerating(false);
    }
  }

  async function disconnect() {
    await fetch("/api/settings/telegram", { method: "DELETE" });
    setConnected(false);
    setInstruments([]);
    setConfidenceFilter(["high", "medium", "low"]);
    setLinkCode(null);
  }

  async function toggleInstrument(code: string) {
    const next = instruments.includes(code)
      ? instruments.filter((i) => i !== code)
      : [...instruments, code];
    setInstruments(next);
    await fetch("/api/settings/telegram", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruments: next }),
    });
  }

  async function toggleConfidence(level: string) {
    const next = confidenceFilter.includes(level)
      ? confidenceFilter.filter((c) => c !== level)
      : [...confidenceFilter, level];
    // Must have at least one selected
    if (next.length === 0) return;
    setConfidenceFilter(next);
    await fetch("/api/settings/telegram", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confidenceFilter: next }),
    });
  }

  function copyCode() {
    if (linkCode) {
      navigator.clipboard.writeText(linkCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl font-bold text-white mb-2">Settings</h1>
      <p className="text-sm text-white/40 mb-8">Manage your account and notifications</p>

      {/* Telegram Connection */}
      <div className="relative rounded-[1.25rem] mb-6">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={3} disabled={false} />
        <div className="bg-white/[0.06] rounded-[1.25rem] border border-white/10 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="h-5 w-5 text-[#2AABEE]" />
            <h2 className="text-lg font-semibold text-white">Telegram</h2>
            {connected && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-400 bg-green-500/15 px-2 py-0.5 rounded-full">
                <Check className="h-3 w-3" />
                Connected
              </span>
            )}
          </div>

          <p className="text-sm text-white/40 mb-5">
            Connect your Telegram to receive daily market reports with headlines and bias analysis for your selected instruments.
          </p>

          {connected ? (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={async () => {
                  setSendingTest(true);
                  setTestSent(false);
                  try {
                    const res = await fetch("/api/telegram/test-report", { method: "POST" });
                    if (res.ok) setTestSent(true);
                  } catch {} finally {
                    setSendingTest(false);
                    setTimeout(() => setTestSent(false), 3000);
                  }
                }}
                disabled={sendingTest || instruments.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#2AABEE] hover:bg-[#229ED9] transition-colors cursor-pointer disabled:opacity-50"
              >
                {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : testSent ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                {sendingTest ? "Sending..." : testSent ? "Sent!" : "Send Test Report"}
              </button>
              <button
                onClick={disconnect}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
              >
                <Unlink className="h-4 w-4" />
                Disconnect
              </button>
            </div>
          ) : linkCode ? (
            <div>
              <p className="text-sm text-white/60 mb-3">
                Send this code to <span className="font-semibold text-white">@TradeoraBot</span> on Telegram:
              </p>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-white/[0.08] border border-white/15 rounded-lg px-5 py-3">
                  <span className="text-2xl font-mono font-bold tracking-[0.3em] text-white">
                    {linkCode}
                  </span>
                </div>
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white/60 bg-white/[0.06] hover:bg-white/[0.1] transition-colors cursor-pointer"
                >
                  {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-white/30">
                Code expires in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
              </p>
            </div>
          ) : (
            <button
              onClick={generateCode}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-[#2AABEE] hover:bg-[#229ED9] transition-colors cursor-pointer disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              Connect Telegram
            </button>
          )}
        </div>
      </div>

      {/* Instrument Selection */}
      {connected && (
        <div className="bg-white/[0.06] rounded-[1.25rem] border border-white/10 backdrop-blur-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-2">Daily Report Instruments</h2>
          <p className="text-sm text-white/40 mb-5">
            Select which instruments to include in your daily Telegram report.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_INSTRUMENTS.map((code) => {
              const selected = instruments.includes(code);
              return (
                <button
                  key={code}
                  onClick={() => toggleInstrument(code)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer",
                    selected
                      ? "bg-white/[0.1] border-white/20 text-white"
                      : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06] hover:text-white/60"
                  )}
                >
                  <InstrumentIcon code={code} size="sm" />
                  <span className="text-sm font-medium flex-1 text-left">{code}</span>
                  {selected && <Check className="h-4 w-4 text-green-400" />}
                </button>
              );
            })}
          </div>

          {instruments.length === 0 && (
            <p className="text-xs text-white/30 mt-3">
              Select at least one instrument to receive daily reports.
            </p>
          )}
        </div>
      )}

      {/* Confidence Filter */}
      {connected && (
        <div className="bg-white/[0.06] rounded-[1.25rem] border border-white/10 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Filter className="h-5 w-5 text-white/60" />
            <h2 className="text-lg font-semibold text-white">News Impact Filter</h2>
          </div>
          <p className="text-sm text-white/40 mb-5">
            Choose which impact levels to include in your reports. Select multiple.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            {CONFIDENCE_LEVELS.map((level) => {
              const selected = confidenceFilter.includes(level.value);
              return (
                <button
                  key={level.value}
                  onClick={() => toggleConfidence(level.value)}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all cursor-pointer flex-1",
                    selected
                      ? level.activeBg + " " + level.color
                      : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06] hover:text-white/60"
                  )}
                >
                  <span className="text-sm font-medium">{level.label}</span>
                  {selected && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
