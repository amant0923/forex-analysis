import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getCommunitySettings, updateCommunitySettings } from "@/lib/community-queries";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getCommunitySettings(user.id);
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { leaderboard_opt_in, display_name } = body;

  if (typeof leaderboard_opt_in !== "boolean" || typeof display_name !== "string") {
    return NextResponse.json({ error: "leaderboard_opt_in (boolean) and display_name (string) are required" }, { status: 400 });
  }

  await updateCommunitySettings(user.id, leaderboard_opt_in, display_name);
  return NextResponse.json({ success: true });
}
