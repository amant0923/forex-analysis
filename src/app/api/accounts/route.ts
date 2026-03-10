import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getAccounts, createAccount } from "@/lib/journal-queries";
import { getTierLimits, countAccounts } from "@/lib/tier-limits";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await getAccounts(user.id);
  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limits = getTierLimits(user.tier);
  if (limits.max_accounts !== null) {
    const count = await countAccounts(user.id);
    if (count >= limits.max_accounts) {
      return NextResponse.json({ error: `Account limit reached (${limits.max_accounts})` }, { status: 403 });
    }
  }

  const body = await req.json();
  if (!body.name || !body.account_size) {
    return NextResponse.json({ error: "Name and account size are required" }, { status: 400 });
  }

  const account = await createAccount(user.id, body);
  return NextResponse.json(account, { status: 201 });
}
