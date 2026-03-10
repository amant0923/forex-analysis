import { NextRequest, NextResponse } from "next/server";
import { getEconomicEventsByWeek } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const startDate = request.nextUrl.searchParams.get("start");
  if (!startDate) {
    return NextResponse.json({ error: "Missing start parameter" }, { status: 400 });
  }

  const currenciesParam = request.nextUrl.searchParams.get("currencies");
  const impactsParam = request.nextUrl.searchParams.get("impacts");

  const currencies = currenciesParam ? currenciesParam.split(",") : undefined;
  const impacts = impactsParam ? impactsParam.split(",") : undefined;

  const events = await getEconomicEventsByWeek(startDate, currencies, impacts);
  return NextResponse.json({ events });
}
