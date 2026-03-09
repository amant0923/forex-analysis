import { NextRequest, NextResponse } from "next/server";
import {
  getLatestBiases,
  getArticlesWithAnalysesForInstrument,
} from "@/lib/queries";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const biases = await getLatestBiases(code);
  const articles = await getArticlesWithAnalysesForInstrument(code, 30);

  return NextResponse.json({ biases, articles });
}
