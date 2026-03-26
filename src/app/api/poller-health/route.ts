import { NextResponse } from "next/server";
import { getPollerHealth } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await getPollerHealth();
  if (!health) {
    return NextResponse.json({ last_run: null, articles_found: 0 });
  }
  return NextResponse.json(health);
}
