import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getTierLimits } from "@/lib/tier-limits";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limits = getTierLimits(user.tier);
  return NextResponse.json({ tier: user.tier, limits });
}
