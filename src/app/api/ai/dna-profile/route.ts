import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getTierLimits } from "@/lib/tier-limits";
import {
  canGenerateInsights,
  getLatestDNAProfile,
  generateDNAProfile,
  canRegenerateDNAProfile,
} from "@/lib/trader-insights";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limits = getTierLimits(user.tier);
  if (!limits.has_dna_profile) {
    return NextResponse.json({ error: "Premium subscription required" }, { status: 403 });
  }

  const month = req.nextUrl.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid month format. Use YYYY-MM" }, { status: 400 });
  }

  const { profile, generated_at } = await getLatestDNAProfile(user.id, month);
  return NextResponse.json({ profile, generated_at });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limits = getTierLimits(user.tier);
  if (!limits.has_dna_profile) {
    return NextResponse.json({ error: "Premium subscription required" }, { status: 403 });
  }

  const body = await req.json();
  const month = body.month;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid month format. Use YYYY-MM" }, { status: 400 });
  }

  const { eligible, tradeCount } = await canGenerateInsights(user.id);
  if (!eligible) {
    return NextResponse.json(
      { error: `Need at least 20 closed trades (currently ${tradeCount})` },
      { status: 400 }
    );
  }

  const canRegenerate = await canRegenerateDNAProfile(user.id, month);
  if (!canRegenerate) {
    return NextResponse.json(
      { error: "DNA profile can only be generated once per month" },
      { status: 429 }
    );
  }

  const profile = await generateDNAProfile(user.id, month);
  return NextResponse.json({ profile, generated_at: new Date().toISOString() });
}
