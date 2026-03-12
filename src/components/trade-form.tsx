"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { calculatePnl, calculateRR, isForex } from "@/lib/pnl-calc";
import type { Playbook, PlaybookRule, TradingAccount } from "@/types";

const INSTRUMENTS = ["DXY", "EURUSD", "GBPUSD", "USDJPY", "EURJPY", "GBPJPY", "EURGBP", "XAUUSD", "XAGUSD", "GER40", "US30", "NAS100", "SP500"];
const SESSIONS = ["london", "new_york", "asia", "overlap"] as const;
const TIMEFRAMES = ["M1", "M5", "M15", "H1", "H4", "D1"] as const;
const EMOTIONS_BEFORE = ["confident", "calm", "anxious", "FOMO", "revenge", "uncertain"] as const;
const EMOTIONS_AFTER = ["satisfied", "frustrated", "relieved", "regretful", "neutral"] as const;

interface TradeFormProps {
  tradeId?: number;
}

interface FormState {
  account_id: string;
  instrument: string;
  direction: "buy" | "sell";
  entry_price: string;
  exit_price: string;
  stop_loss: string;
  take_profit: string;
  lot_size: string;
  opened_at: string;
  closed_at: string;
  playbook_id: string;
  session: string;
  timeframe_traded: string;
  emotion_before: string;
  emotion_after: string;
  notes: string;
}

const emptyForm: FormState = {
  account_id: "",
  instrument: "",
  direction: "buy",
  entry_price: "",
  exit_price: "",
  stop_loss: "",
  take_profit: "",
  lot_size: "",
  opened_at: "",
  closed_at: "",
  playbook_id: "",
  session: "",
  timeframe_traded: "",
  emotion_before: "",
  emotion_after: "",
  notes: "",
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TradeForm({ tradeId }: TradeFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [playbookRules, setPlaybookRules] = useState<PlaybookRule[]>([]);
  const [checkedRules, setCheckedRules] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loadingTrade, setLoadingTrade] = useState(!!tradeId);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!tradeId;

  // Fetch accounts + playbooks on mount
  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => {});

    fetch("/api/playbooks")
      .then((r) => r.json())
      .then((data) => setPlaybooks(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Fetch trade data for edit mode
  useEffect(() => {
    if (!tradeId) return;
    setLoadingTrade(true);
    fetch(`/api/trades/${tradeId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Trade not found");
        return r.json();
      })
      .then((trade) => {
        setForm({
          account_id: String(trade.account_id),
          instrument: trade.instrument,
          direction: trade.direction,
          entry_price: String(trade.entry_price),
          exit_price: trade.exit_price !== null ? String(trade.exit_price) : "",
          stop_loss: trade.stop_loss !== null ? String(trade.stop_loss) : "",
          take_profit: trade.take_profit !== null ? String(trade.take_profit) : "",
          lot_size: String(trade.lot_size),
          opened_at: toDatetimeLocal(trade.opened_at),
          closed_at: toDatetimeLocal(trade.closed_at),
          playbook_id: trade.playbook_id ? String(trade.playbook_id) : "",
          session: trade.session ?? "",
          timeframe_traded: trade.timeframe_traded ?? "",
          emotion_before: trade.emotion_before ?? "",
          emotion_after: trade.emotion_after ?? "",
          notes: trade.notes ?? "",
        });
        // Restore checked rules
        if (trade.rule_adherence_details) {
          const checked = new Set<number>();
          for (const detail of trade.rule_adherence_details) {
            if (detail.followed) checked.add(detail.rule_id);
          }
          setCheckedRules(checked);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingTrade(false));
  }, [tradeId]);

  // Fetch playbook rules when playbook changes
  useEffect(() => {
    if (!form.playbook_id) {
      setPlaybookRules([]);
      setCheckedRules(new Set());
      return;
    }
    fetch(`/api/playbooks/${form.playbook_id}`)
      .then((r) => r.json())
      .then((data) => {
        setPlaybookRules(data.rules || []);
      })
      .catch(() => setPlaybookRules([]));
  }, [form.playbook_id]);

  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
    },
    []
  );

  // Get selected account for P&L calc
  const selectedAccount = useMemo(
    () => accounts.find((a) => String(a.id) === form.account_id),
    [accounts, form.account_id]
  );

  // Auto-calculated P&L
  const pnlCalc = useMemo(() => {
    const entry = parseFloat(form.entry_price);
    const exit = parseFloat(form.exit_price);
    const lot = parseFloat(form.lot_size);
    const sl = parseFloat(form.stop_loss);
    const accountSize = selectedAccount?.account_size ?? 0;

    if (!form.instrument || isNaN(entry) || isNaN(lot)) return null;

    let pnl = null;
    let rr = null;

    if (!isNaN(exit)) {
      pnl = calculatePnl(form.instrument, form.direction, entry, exit, lot, accountSize);
    }
    if (!isNaN(exit) && !isNaN(sl)) {
      rr = calculateRR(form.direction, entry, exit, sl);
    }

    return { pnl, rr };
  }, [form.instrument, form.direction, form.entry_price, form.exit_price, form.lot_size, form.stop_loss, selectedAccount]);

  // Rule adherence score
  const ruleAdherenceScore = useMemo(() => {
    if (playbookRules.length === 0) return null;
    return Math.round((checkedRules.size / playbookRules.length) * 100);
  }, [playbookRules, checkedRules]);

  function toggleRule(ruleId: number) {
    setCheckedRules((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) next.delete(ruleId);
      else next.add(ruleId);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      account_id: Number(form.account_id),
      instrument: form.instrument,
      direction: form.direction,
      entry_price: Number(form.entry_price),
      exit_price: form.exit_price ? Number(form.exit_price) : null,
      stop_loss: form.stop_loss ? Number(form.stop_loss) : null,
      take_profit: form.take_profit ? Number(form.take_profit) : null,
      lot_size: Number(form.lot_size),
      opened_at: new Date(form.opened_at).toISOString(),
      closed_at: form.closed_at ? new Date(form.closed_at).toISOString() : null,
      playbook_id: form.playbook_id ? Number(form.playbook_id) : null,
      session: form.session || null,
      timeframe_traded: form.timeframe_traded || null,
      emotion_before: form.emotion_before || null,
      emotion_after: form.emotion_after || null,
      notes: form.notes.trim() || null,
    };

    // Rule adherence
    if (playbookRules.length > 0) {
      payload.rule_adherence_score = ruleAdherenceScore;
      payload.rule_adherence_details = playbookRules.map((r) => ({
        rule_id: r.id,
        followed: checkedRules.has(r.id),
      }));
    }

    try {
      const url = isEdit ? `/api/trades/${tradeId}` : "/api/trades";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save trade");
      }
      const trade = await res.json();
      router.push(`/journal/${trade.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loadingTrade) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-white/30" />
        <span className="ml-2 text-sm text-white/40">Loading trade...</span>
      </div>
    );
  }

  // Group rules by category
  const rulesByCategory = playbookRules.reduce<Record<string, PlaybookRule[]>>((acc, rule) => {
    const cat = rule.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(rule);
    return acc;
  }, {});

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Trade Details */}
      <Card>
        <CardContent className="pt-2">
          <h3 className="text-sm font-medium text-white mb-4">Trade Details</h3>

          <div className="space-y-4">
            {/* Account */}
            <div className="space-y-1.5">
              <Label htmlFor="account_id">
                Account <span className="text-red-500">*</span>
              </Label>
              <select
                id="account_id"
                value={form.account_id}
                onChange={(e) => updateField("account_id", e.target.value)}
                required
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Select account...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.broker ?? "No broker"})
                  </option>
                ))}
              </select>
            </div>

            {/* Instrument */}
            <div className="space-y-1.5">
              <Label>
                Instrument <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {INSTRUMENTS.map((inst) => (
                  <button
                    key={inst}
                    type="button"
                    onClick={() => updateField("instrument", inst)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer",
                      form.instrument === inst
                        ? "bg-white/[0.2] text-white border-white/25"
                        : "bg-white/[0.06] text-white/60 border-white/10 hover:border-white/[0.15]"
                    )}
                  >
                    {inst}
                  </button>
                ))}
              </div>
              {form.instrument === "DXY" && (
                <p className="text-xs text-amber-600 mt-1">
                  Tracking only -- most brokers don&apos;t offer DXY directly
                </p>
              )}
            </div>

            {/* Direction */}
            <div className="space-y-1.5">
              <Label>
                Direction <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateField("direction", "buy")}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer",
                    form.direction === "buy"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white/[0.06] text-white/60 border-white/10 hover:border-white/[0.15]"
                  )}
                >
                  Buy
                </button>
                <button
                  type="button"
                  onClick={() => updateField("direction", "sell")}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer",
                    form.direction === "sell"
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-white/[0.06] text-white/60 border-white/10 hover:border-white/[0.15]"
                  )}
                >
                  Sell
                </button>
              </div>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="entry_price">
                  Entry Price <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="entry_price"
                  type="number"
                  step="any"
                  value={form.entry_price}
                  onChange={(e) => updateField("entry_price", e.target.value)}
                  required
                  placeholder="0.00000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exit_price">Exit Price</Label>
                <Input
                  id="exit_price"
                  type="number"
                  step="any"
                  value={form.exit_price}
                  onChange={(e) => updateField("exit_price", e.target.value)}
                  placeholder="0.00000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stop_loss">Stop Loss</Label>
                <Input
                  id="stop_loss"
                  type="number"
                  step="any"
                  value={form.stop_loss}
                  onChange={(e) => updateField("stop_loss", e.target.value)}
                  placeholder="0.00000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="take_profit">Take Profit</Label>
                <Input
                  id="take_profit"
                  type="number"
                  step="any"
                  value={form.take_profit}
                  onChange={(e) => updateField("take_profit", e.target.value)}
                  placeholder="0.00000"
                />
              </div>
            </div>

            {/* Lot size */}
            <div className="space-y-1.5">
              <Label htmlFor="lot_size">
                Lot Size <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lot_size"
                type="number"
                step="any"
                min="0"
                value={form.lot_size}
                onChange={(e) => updateField("lot_size", e.target.value)}
                required
                placeholder="e.g. 0.10"
                className="max-w-[200px]"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="opened_at">
                  Opened At <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="opened_at"
                  type="datetime-local"
                  value={form.opened_at}
                  onChange={(e) => updateField("opened_at", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="closed_at">Closed At</Label>
                <Input
                  id="closed_at"
                  type="datetime-local"
                  value={form.closed_at}
                  onChange={(e) => updateField("closed_at", e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Calculated P&L */}
      {pnlCalc && pnlCalc.pnl && (
        <Card>
          <CardContent className="pt-2">
            <h3 className="text-sm font-medium text-white mb-3">Calculated P&L</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-white/40 mb-0.5">
                  {isForex(form.instrument) ? "Pips" : "Ticks"}
                </p>
                <p
                  className={cn(
                    "text-sm font-semibold font-mono",
                    (pnlCalc.pnl.pnl_dollars ?? 0) >= 0 ? "text-green-400" : "text-red-400"
                  )}
                >
                  {isForex(form.instrument)
                    ? pnlCalc.pnl.pnl_pips ?? "--"
                    : pnlCalc.pnl.pnl_ticks ?? "--"}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-0.5">P&L ($)</p>
                <p
                  className={cn(
                    "text-sm font-semibold font-mono",
                    pnlCalc.pnl.pnl_dollars >= 0 ? "text-green-400" : "text-red-400"
                  )}
                >
                  {pnlCalc.pnl.pnl_dollars >= 0 ? "+" : ""}
                  ${pnlCalc.pnl.pnl_dollars.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-0.5">R:R</p>
                <p className="text-sm font-semibold font-mono text-white">
                  {pnlCalc.rr !== null ? pnlCalc.rr.toFixed(2) : "--"}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-0.5">Account %</p>
                <p
                  className={cn(
                    "text-sm font-semibold font-mono",
                    pnlCalc.pnl.account_pct_impact >= 0 ? "text-green-400" : "text-red-400"
                  )}
                >
                  {pnlCalc.pnl.account_pct_impact >= 0 ? "+" : ""}
                  {pnlCalc.pnl.account_pct_impact.toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategy Section */}
      {playbooks.length > 0 && (
        <Card>
          <CardContent className="pt-2">
            <h3 className="text-sm font-medium text-white mb-4">Strategy</h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="playbook_id">Playbook</Label>
                <select
                  id="playbook_id"
                  value={form.playbook_id}
                  onChange={(e) => updateField("playbook_id", e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">No playbook</option>
                  {playbooks.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Playbook rules checklist */}
              {playbookRules.length > 0 && (
                <div className="space-y-3">
                  {Object.entries(rulesByCategory).map(([category, rules]) => (
                    <div key={category}>
                      <p className="text-xs font-medium text-white/40 uppercase tracking-wide mb-2">
                        {category} Rules
                      </p>
                      <div className="space-y-1.5">
                        {rules.map((rule) => (
                          <label
                            key={rule.id}
                            className="flex items-start gap-2.5 cursor-pointer group"
                          >
                            <input
                              type="checkbox"
                              checked={checkedRules.has(rule.id)}
                              onChange={() => toggleRule(rule.id)}
                              className="mt-0.5 h-4 w-4 rounded border-white/[0.12] text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-white/80 group-hover:text-white">
                              {rule.rule_text}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  {ruleAdherenceScore !== null && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-white/40">Rule Adherence:</span>
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          ruleAdherenceScore >= 80
                            ? "text-green-400"
                            : ruleAdherenceScore >= 50
                              ? "text-amber-600"
                              : "text-red-400"
                        )}
                      >
                        {ruleAdherenceScore}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Context */}
      <Card>
        <CardContent className="pt-2">
          <h3 className="text-sm font-medium text-white mb-4">Context</h3>

          <div className="space-y-4">
            {/* Session */}
            <div className="space-y-1.5">
              <Label>Session</Label>
              <div className="flex flex-wrap gap-2">
                {SESSIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateField("session", form.session === s ? "" : s)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer capitalize",
                      form.session === s
                        ? "bg-white/[0.2] text-white border-white/25"
                        : "bg-white/[0.06] text-white/60 border-white/10 hover:border-white/[0.15]"
                    )}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeframe */}
            <div className="space-y-1.5">
              <Label>Timeframe Traded</Label>
              <div className="flex flex-wrap gap-2">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => updateField("timeframe_traded", form.timeframe_traded === tf ? "" : tf)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer",
                      form.timeframe_traded === tf
                        ? "bg-white/[0.2] text-white border-white/25"
                        : "bg-white/[0.06] text-white/60 border-white/10 hover:border-white/[0.15]"
                    )}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Emotion before */}
            <div className="space-y-1.5">
              <Label>Emotion Before</Label>
              <div className="flex flex-wrap gap-2">
                {EMOTIONS_BEFORE.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => updateField("emotion_before", form.emotion_before === em ? "" : em)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer capitalize",
                      form.emotion_before === em
                        ? "bg-white/[0.2] text-white border-white/25"
                        : "bg-white/[0.06] text-white/60 border-white/10 hover:border-white/[0.15]"
                    )}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Emotion after */}
            <div className="space-y-1.5">
              <Label>Emotion After</Label>
              <div className="flex flex-wrap gap-2">
                {EMOTIONS_AFTER.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => updateField("emotion_after", form.emotion_after === em ? "" : em)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer capitalize",
                      form.emotion_after === em
                        ? "bg-white/[0.2] text-white border-white/25"
                        : "bg-white/[0.06] text-white/60 border-white/10 hover:border-white/[0.15]"
                    )}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="pt-2">
          <h3 className="text-sm font-medium text-white mb-4">Notes</h3>
          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            placeholder="Trade notes, observations, lessons learned..."
            rows={4}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y"
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex items-center gap-3 pb-8">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" data-icon="inline-start" />}
          {isEdit ? "Save Changes" : "Log Trade"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/journal")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
