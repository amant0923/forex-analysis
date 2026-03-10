import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getPlaybookWithRules, updatePlaybook, deletePlaybook } from "@/lib/journal-queries";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const playbook = await getPlaybookWithRules(Number(id), user.id);
  if (!playbook) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(playbook);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const playbook = await updatePlaybook(Number(id), user.id, body);
  if (!playbook) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(playbook);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const deleted = await deletePlaybook(Number(id), user.id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
