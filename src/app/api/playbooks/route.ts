import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getPlaybooksWithStats, createPlaybook } from "@/lib/journal-queries";
import { getTierLimits, countPlaybooks } from "@/lib/tier-limits";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const playbooks = await getPlaybooksWithStats(user.id);
  return NextResponse.json(playbooks);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limits = getTierLimits(user.tier);
  if (limits.max_playbooks !== null) {
    const count = await countPlaybooks(user.id);
    if (count >= limits.max_playbooks) {
      return NextResponse.json({ error: `Playbook limit reached (${limits.max_playbooks})` }, { status: 403 });
    }
  }

  const body = await req.json();
  if (!body.name || !body.rules || !Array.isArray(body.rules)) {
    return NextResponse.json({ error: "Name and rules are required" }, { status: 400 });
  }

  const playbook = await createPlaybook(user.id, body);
  return NextResponse.json(playbook, { status: 201 });
}
