import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getAccount, updateAccount, deleteAccount } from "@/lib/journal-queries";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const account = await getAccount(Number(id), user.id);
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(account);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const account = await updateAccount(Number(id), user.id, body);
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(account);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const deleted = await deleteAccount(Number(id), user.id);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Cannot delete account with existing trades" }, { status: 409 });
  }
}
