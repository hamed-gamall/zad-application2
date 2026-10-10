import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

interface QuranEntry {
  surah: number;
  surahName: string;
  ayah: number;
  text: string;
}
interface HadithEntry {
  book: string;
  bookName: string;
  number: number;
  text: string;
}
interface AzkarEntry {
  categoryId: number;
  category: string;
  itemId: number;
  text: string;
}
interface DuaEntry {
  category: string;
  index: number;
  text: string;
}
interface ToolEntry {
  title: string;
  href: string;
  keywords: string;
}
interface ReciterEntry {
  id: number;
  name: string;
}

// Module-scope cache: index files are read/parsed once per server instance,
// not per request.
let quranIndex: QuranEntry[] | null = null;
let hadithIndex: HadithEntry[] | null = null;
let azkarIndex: AzkarEntry[] | null = null;
let duaIndex: DuaEntry[] | null = null;
let reciterIndex: ReciterEntry[] | null = null;

const TOOLS: ToolEntry[] = [
  { title: "مواقيت الصلاة", href: "/tools/prayer-times", keywords: "مواقيت الصلاة الصلاه اذان اوقات" },
  { title: "اتجاه القبلة", href: "/tools/qibla", keywords: "قبلة اتجاه القبله compass" },
  { title: "التقويم الهجري", href: "/tools/calendar", keywords: "تقويم هجري هجرية شهر مناسبات عيد رمضان" },
  { title: "المسبحة الإلكترونية", href: "/tools/tasbih", keywords: "مسبحة تسبيح سبحة عداد" },
  { title: " الإذاعات القرآنية", href: "/tools/radio", keywords: " ذاعات اذاعات قرآن قران بث مباشر إذاعة القرآن الكريم راديو" },
  { title: "التواشيح والابتهالات", href: "/tools/tawashih", keywords: "تواشيح ابتهالات ابتهال إنشاد أناشيد دينية منشدين " },
  { title: "مولّد فيديو قرآني", href: "/tools/quran-video-generator", keywords: "مولد فيديو قرآني قرآن قران فيديو آيات آية تصميم فيديو قرآني" },
  { title: " أسماء الله الحسنى", href: "/names", keywords: "أسماء الله الحسنى اسماء الله اسماء الحسنى أسماء صفات الله " },
  { title: "الإعدادات", href: "/settings", keywords: "اعدادات ثيم خط تصميم تطبيق" },
  { title: "محفوظاتي", href: "/my", keywords: "محفوظات مفضلة حفظ" },
];

async function loadIndexes() {
  if (!quranIndex) {
    const raw = await fs.readFile(path.join(process.cwd(), "data/search/quran.json"), "utf-8");
    quranIndex = JSON.parse(raw);
  }
  if (!hadithIndex) {
    const raw = await fs.readFile(path.join(process.cwd(), "data/search/hadith.json"), "utf-8");
    hadithIndex = JSON.parse(raw);
  }
  if (!azkarIndex) {
    try {
      const raw = await fs.readFile(path.join(process.cwd(), "data/azkar/azkar.json"), "utf-8");
      const parsed = JSON.parse(raw) as {
        categories: { id: number; category: string; items: { id: number; text: string }[] }[];
      };
      azkarIndex = parsed.categories.flatMap((c) =>
        c.items.map((it) => ({
          categoryId: c.id,
          category: c.category,
          itemId: it.id,
          text: it.text,
        }))
      );
    } catch {
      azkarIndex = [];
    }
  }
  if (!duaIndex) {
    try {
      const raw = await fs.readFile(path.join(process.cwd(), "data/dua/dua.json"), "utf-8");
      const parsed = JSON.parse(raw) as {
        categories: { category: string; items: { text: string }[] }[];
      };
      duaIndex = parsed.categories.flatMap((c) =>
        c.items.map((it, i) => ({ category: c.category, index: i, text: it.text }))
      );
    } catch {
      duaIndex = [];
    }
  }
  if (!reciterIndex) {
    try {
      const res = await fetch("https://www.mp3quran.net/api/v3/reciters?language=ar");
      const json = await res.json();
      reciterIndex = (json.reciters as { id: number; name: string }[]).map((r) => ({
        id: r.id,
        name: r.name,
      }));
    } catch {
      reciterIndex = [];
    }
  }
}

// Strip Arabic diacritics (tashkeel) so search matches regardless of them.
function normalize(s: string) {
  return s
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim()
    .toLowerCase();
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  // all | quran | hadith | azkar | dua | tools
  const scope = req.nextUrl.searchParams.get("scope") ?? "all";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 30), 100);

  if (q.length < 2) {
    return NextResponse.json({ quran: [], hadith: [], azkar: [], dua: [], tools: [] });
  }

  await loadIndexes();
  const needle = normalize(q);
  const want = (s: string) => scope === "all" || scope === s;

  const quranResults = want("quran")
    ? quranIndex!.filter((e) => normalize(e.text).includes(needle)).slice(0, limit)
    : [];

  const hadithResults = want("hadith")
    ? hadithIndex!.filter((e) => normalize(e.text).includes(needle)).slice(0, limit)
    : [];

  const azkarResults = want("azkar")
    ? azkarIndex!.filter((e) => normalize(e.text).includes(needle)).slice(0, limit)
    : [];

  const duaResults = want("dua")
    ? duaIndex!.filter((e) => normalize(e.text).includes(needle)).slice(0, limit)
    : [];

  const toolsResults = want("tools")
    ? TOOLS.filter((t) => normalize(t.keywords).includes(needle) || normalize(t.title).includes(needle)).slice(0, limit)
    : [];

  const reciterResults = want("reciters")
    ? reciterIndex!.filter((r) => normalize(r.name).includes(needle)).slice(0, limit)
    : [];

  return NextResponse.json({
    quran: quranResults,
    hadith: hadithResults,
    azkar: azkarResults,
    dua: duaResults,
    tools: toolsResults,
    reciters: reciterResults,
  });
}
