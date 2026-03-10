"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Loader2, X, Wallet } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";

interface Account {
  id: number;
  name: string;
  broker: string | null;
  account_size: number;
  currency: string;
  leverage: number | null;
  created_at: string;
}

interface FormData {
  name: string;
  broker: string;
  account_size: string;
  currency: string;
  leverage: string;
}

const emptyForm: FormData = {
  name: "",
  broker: "",
  account_size: "",
  currency: "USD",
  leverage: "",
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AccountsManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const data = await res.json();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError(null);
  }

  function openEditForm(account: Account) {
    setEditingId(account.id);
    setForm({
      name: account.name,
      broker: account.broker ?? "",
      account_size: String(account.account_size),
      currency: account.currency,
      leverage: account.leverage ? String(account.leverage) : "",
    });
    setShowForm(true);
    setError(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const accountSize = parseFloat(form.account_size);
    if (!form.name.trim()) {
      setError("Account name is required");
      setSaving(false);
      return;
    }
    if (isNaN(accountSize) || accountSize <= 0) {
      setError("Enter a valid account size");
      setSaving(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      broker: form.broker.trim() || null,
      account_size: accountSize,
      currency: form.currency,
      leverage: form.leverage ? Number(form.leverage) : null,
    };

    try {
      if (editingId) {
        const res = await fetch(`/api/accounts/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update account");
        }
        const updated = await res.json();
        setAccounts((prev) =>
          prev.map((a) => (a.id === editingId ? updated : a))
        );
      } else {
        const res = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.status === 403) {
          setLimitReached(true);
          const data = await res.json();
          throw new Error(data.error || "Account limit reached");
        }
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create account");
        }
        const created = await res.json();
        setAccounts((prev) => [...prev, created]);
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this account?")) return;
    setDeletingId(id);
    setError(null);

    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete account");
      }
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setLimitReached(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-white/30" />
        <span className="ml-2 text-sm text-white/40">Loading accounts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">
          {accounts.length} account{accounts.length !== 1 ? "s" : ""}
        </p>
        {!showForm && (
          <Button onClick={openAddForm} size="sm" disabled={limitReached}>
            <Plus className="h-4 w-4" data-icon="inline-start" />
            Add Account
          </Button>
        )}
      </div>

      {/* Tier limit warning */}
      {limitReached && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          You have reached the maximum number of trading accounts for your plan.
          Upgrade to add more.
        </div>
      )}

      {/* Error banner */}
      {error && !showForm && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Inline form */}
      {showForm && (
        <Card>
          <CardContent className="pt-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">
                {editingId ? "Edit Account" : "New Account"}
              </h3>
              <Button variant="ghost" size="icon-xs" onClick={closeForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">
                    Account Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g. Main Live Account"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="broker">Broker</Label>
                  <Input
                    id="broker"
                    placeholder="e.g. IC Markets"
                    value={form.broker}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, broker: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="account_size">
                    Account Size <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="account_size"
                    type="text"
                    inputMode="decimal"
                    placeholder="10000"
                    value={form.account_size}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d*\.?\d*$/.test(val)) {
                        setForm((f) => ({ ...f, account_size: val }));
                      }
                    }}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    value={form.currency}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, currency: e.target.value }))
                    }
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="leverage">Leverage</Label>
                  <Input
                    id="leverage"
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 100"
                    value={form.leverage}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d+$/.test(val)) {
                        setForm((f) => ({ ...f, leverage: val }));
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" data-icon="inline-start" />}
                  {editingId ? "Save Changes" : "Create Account"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={closeForm}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {accounts.length === 0 && !showForm && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-white/[0.06] p-3 mb-4">
              <Wallet className="h-6 w-6 text-white/30" />
            </div>
            <p className="text-sm font-medium text-white mb-1">
              No trading accounts yet
            </p>
            <p className="text-sm text-white/40 mb-5">
              Add one to start logging trades.
            </p>
            <Button onClick={openAddForm} size="sm">
              <Plus className="h-4 w-4" data-icon="inline-start" />
              Add Account
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Accounts list */}
      {accounts.length > 0 && (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div key={account.id} className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2">
              <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={3} disabled={false} />
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="shrink-0 rounded-lg bg-blue-500/10 p-2">
                        <Wallet className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white truncate">
                            {account.name}
                          </span>
                          {account.broker && (
                            <span className="text-xs text-white/30">
                              {account.broker}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-white/40">
                          <span className="font-mono font-medium text-white/80">
                            {formatCurrency(account.account_size, account.currency)}
                          </span>
                          <span>{account.currency}</span>
                          {account.leverage && (
                            <span>1:{account.leverage}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openEditForm(account)}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5 text-white/30" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(account.id)}
                        disabled={deletingId === account.id}
                        title="Delete"
                      >
                        {deletingId === account.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-white/30" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-white/30 hover:text-red-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
