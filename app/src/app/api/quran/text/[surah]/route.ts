import { NextRequest, NextResponse } from "next/server";
import { getSurahText } from "@/lib/data";

export const revalidate = 86400;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ surah: string }> }
) {
  const { surah } = await params;
  const n = Number(surah);
  if (!Number.isInteger(n) || n < 1 || n > 114) {
    return NextResponse.json({ error: "رقم سورة غير صحيح" }, { status: 400 });
  }
  try {
    const text = await getSurahText(n);
    return NextResponse.json(text, {
      headers: { "Cache-Control": "public, max-age=86400, immutable" },
    });
  } catch {
    return NextResponse.json({ error: "تعذّر تحميل نص السورة" }, { status: 500 });
  }
}
