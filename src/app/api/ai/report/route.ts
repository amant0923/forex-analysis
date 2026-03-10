import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getTierLimits } from "@/lib/tier-limits";
import { generateBasicReport, generateAIReport } from "@/lib/ai-reports";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limits = getTierLimits(user.tier);
  const type = (req.nextUrl.searchParams.get("type") as "weekly" | "monthly") || "weekly";
  const date = req.nextUrl.searchParams.get("date") || new Date().toISOString().split("T")[0];

  if (type === "monthly" && !limits.has_monthly_report) {
    return NextResponse.json({ error: "Monthly reports are a Premium feature" }, { status: 403 });
  }
  if (!limits.has_weekly_report) {
    return NextResponse.json({ error: "Reports require Essential or Premium" }, { status: 403 });
  }

  try {
    const report = limits.has_monthly_report
      ? await generateAIReport(user.id, type, date)
      : await generateBasicReport(user.id, type, date);
    return NextResponse.json(report);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
