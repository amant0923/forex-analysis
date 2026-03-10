import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getTierLimits } from "@/lib/tier-limits";
import { chat, getChatHistory } from "@/lib/ai-chat";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limits = getTierLimits(user.tier);
  if (!limits.has_chat) {
    return NextResponse.json({ error: "Chat is a Premium feature" }, { status: 403 });
  }

  const history = await getChatHistory(user.id);
  return NextResponse.json(history);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limits = getTierLimits(user.tier);
  if (!limits.has_chat) {
    return NextResponse.json({ error: "Chat is a Premium feature" }, { status: 403 });
  }

  const { message } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  try {
    const reply = await chat(user.id, message.trim());
    return NextResponse.json({ reply });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
