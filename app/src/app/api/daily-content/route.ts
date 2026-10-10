import { NextRequest, NextResponse } from "next/server";
import { getDailyContent } from "@/lib/dailyContent";

export async function GET(req: NextRequest) {
  const slotParam = req.nextUrl.searchParams.get("slot");
  const slot = slotParam ? parseInt(slotParam, 10) : NaN;
  if (!Number.isFinite(slot)) {
    return NextResponse.json({ error: "invalid slot" }, { status: 400 });
  }
  const content = await getDailyContent(slot);
  return NextResponse.json(content);
}
