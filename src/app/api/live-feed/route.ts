import { NextRequest, NextResponse } from "next/server";
import { getLiveFeedArticles } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const instrument = request.nextUrl.searchParams.get("instrument") ?? undefined;
  const articles = await getLiveFeedArticles(instrument);
  return NextResponse.json({ articles });
}
