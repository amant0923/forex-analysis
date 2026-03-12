"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, X } from "lucide-react";

const INSTRUMENTS = ["Any", "DXY", "EURUSD", "GBPUSD", "USDJPY", "EURJPY", "GBPJPY", "EURGBP", "XAUUSD", "XAGUSD", "GER40", "US30", "NAS100", "SP500"];
const TIMEFRAMES = ["Any", "M1", "M5", "M15", "H1", "H4", "D1"];
const RULE_CATEGORIES = ["entry", "exit", "risk"] as const;

type RuleCategory = (typeof RULE_CATEGORIES)[number];

interface Rule {
  id: string;
  category: RuleCategory;
  rule_text: string;
}

interface PlaybookData {
  id: number;
  name: string;
  description: string | null;
  instrument: string | null;
  timeframe: string | null;
  rules?: { id: number; category: string; rule_text: string }[];
}

interface PlaybookFormProps {
  mode: "create" | "edit";
  playbook?: PlaybookData;
}

export function PlaybookForm({ mode, playbook }: PlaybookFormProps) {
  const router = useRouter();

  const [name, setName] = useState(playbook?.name ?? "");
  const [description, setDescription] = useState(playbook?.description ?? "");
  const [instrument, setInstrument] = useState(playbook?.instrument ?? "Any");
  const [timeframe, setTimeframe] = useState(playbook?.timeframe ?? "Any");
  const [rules, setRules] = useState<Rule[]>(
    playbook?.rules?.map((r) => ({
      id: crypto.randomUUID(),
      category: r.category as RuleCategory,
      rule_text: r.rule_text,
    })) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addRule() {
    setRules((prev) => [
      ...prev,
      { id: crypto.randomUUID(), category: "entry", rule_text: "" },
    ]);
  }

  function removeRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRule(id: string, field: "category" | "rule_text", value: string) {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      instrument: instrument === "Any" ? null : instrument,
      timeframe: timeframe === "Any" ? null : timeframe,
      rules: rules
        .filter((r) => r.rule_text.trim())
        .map((r) => ({ category: r.category, rule_text: r.rule_text.trim() })),
    };

    try {
      const url =
        mode === "edit" ? `/api/playbooks/${playbook!.id}` : "/api/playbooks";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 403) {
        const data = await res.json();
        throw new Error(data.error || "Playbook limit reached for your plan.");
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save playbook");
      }

      router.push("/playbooks");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const selectClass =
    "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <Card>
      <CardContent className="pt-2">
        <h3 className="text-sm font-medium text-white mb-4">
          {mode === "edit" ? "Edit Playbook" : "New Playbook"}
        </h3>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pb-name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pb-name"
                placeholder="e.g. London Breakout"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pb-instrument">Instrument</Label>
              <select
                id="pb-instrument"
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
                className={selectClass}
              >
                {INSTRUMENTS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pb-desc">Description</Label>
              <textarea
                id="pb-desc"
                placeholder="Describe when and how you use this playbook..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pb-timeframe">Timeframe</Label>
              <select
                id="pb-timeframe"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className={selectClass}
              >
                {TIMEFRAMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rules section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Rules</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addRule}>
                <Plus className="h-3.5 w-3.5" data-icon="inline-start" />
                Add Rule
              </Button>
            </div>

            {rules.length === 0 && (
              <p className="text-xs text-white/30">
                No rules yet. Add rules to define your playbook criteria.
              </p>
            )}

            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-2">
                <select
                  value={rule.category}
                  onChange={(e) =>
                    updateRule(rule.id, "category", e.target.value)
                  }
                  className="h-8 w-24 shrink-0 rounded-lg border border-input bg-transparent px-2 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {RULE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Rule description..."
                  value={rule.rule_text}
                  onChange={(e) =>
                    updateRule(rule.id, "rule_text", e.target.value)
                  }
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeRule(rule.id)}
                >
                  <X className="h-3.5 w-3.5 text-white/30" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" size="sm" disabled={saving}>
              {saving && (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  data-icon="inline-start"
                />
              )}
              {mode === "edit" ? "Save Changes" : "Create Playbook"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push("/playbooks")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
