import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  SurahMeta,
  SurahText,
  TafsirSurah,
  HadithPage,
  HadithBookInfo,
  AzkarCategory,
  DuaCategory,
  AllahName,
  ProphetName,
  JuzMeta,
  SajdaMeta,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

async function readJson<T>(relPath: string): Promise<T> {
  const full = path.join(DATA_DIR, relPath);
  const raw = await fs.readFile(full, "utf-8");
  return JSON.parse(raw) as T;
}

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

// ---------- Tawashih & Anasheed (تواشيح وابتهالات) ----------
export interface TawashihTrack {
  id: string;
  title: string;
  duration: string;
  url: string;
}
export interface TawashihReciter {
  id: string;
  name: string;
  count: number;
  tracks: TawashihTrack[];
}

export async function getTawashihList(): Promise<TawashihReciter[]> {
  return readJson<TawashihReciter[]>("tawashih/tawashih.json");
}

// ---------- Quran ----------
export async function getSurahList(): Promise<SurahMeta[]> {
  return readJson<SurahMeta[]>("quran/meta/surah.json");
}

export async function getJuzList(): Promise<JuzMeta[]> {
  return readJson<JuzMeta[]>("quran/meta/juz.json");
}

export async function getSajdaList(): Promise<SajdaMeta[]> {
  return readJson<SajdaMeta[]>("quran/meta/sajda.json");
}

export async function getSurahText(number: number): Promise<SurahText> {
  return readJson<SurahText>(`quran/text/${pad3(number)}.json`);
}

export type TafsirId = "muyassar" | "saadi" | "e3rab" | "jalalayn" | "qurtubi" | "waseet" | "baghawi" | "tanwir";
export const TAFSIR_LABELS: Record<TafsirId, string> = {
  muyassar: "التفسير الميسر",
  saadi: "تفسير السعدي",
  e3rab: "إعراب القرآن",
  jalalayn: "تفسير الجلالين",
  qurtubi: "تفسير القرطبي",
  waseet: "التفسير الوسيط",
  baghawi: "تفسير البغوي",
  tanwir: "تنوير المقباس (ابن عباس)",
};

export async function getTafsirForSurah(
  tafsirId: TafsirId,
  surahNumber: number
): Promise<TafsirSurah | null> {
  try {
    return await readJson<TafsirSurah>(
      `quran/tafsir/${tafsirId}/${pad3(surahNumber)}.json`
    );
  } catch {
    return null;
  }
}

export async function getTranslationForSurah(
  surahNumber: number
): Promise<TafsirSurah | null> {
  try {
    return await readJson<TafsirSurah>(
      `quran/translation/en_sahih/${pad3(surahNumber)}.json`
    );
  } catch {
    return null;
  }
}

// ---------- Hadith ----------
export async function getHadithIndex(): Promise<{ books: HadithBookInfo[] }> {
  return readJson<{ books: HadithBookInfo[] }>("hadith/index.json");
}

export async function getHadithPage(
  book: string,
  page: number,
  query?: string
): Promise<HadithPage | null> {
  if (query && query.trim()) {
    return getHadithSearchPage(book, page, query.trim());
  }
  try {
    return await readJson<HadithPage>(
      `hadith/${book}/page-${String(page).padStart(4, "0")}.json`
    );
  } catch {
    return null;
  }
}

// ---- In-book text search, backed by the same flattened index used by the
// global search API. Cached at module scope so repeated searches (paging
// through results) don't re-read/parse the ~62k-entry file every time.
interface HadithSearchEntry {
  book: string;
  bookName: string;
  number: number;
  text: string;
}
let hadithSearchIndex: HadithSearchEntry[] | null = null;
async function loadHadithSearchIndex() {
  if (!hadithSearchIndex) {
    hadithSearchIndex = await readJson<HadithSearchEntry[]>("search/hadith.json");
  }
  return hadithSearchIndex;
}
function normalizeArabic(s: string) {
  return s
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();
}
async function getHadithSearchPage(
  book: string,
  page: number,
  query: string
): Promise<HadithPage | null> {
  const { books } = await getHadithIndex();
  const info = books.find((b) => b.slug === book);
  if (!info) return null;
  const index = await loadHadithSearchIndex();
  const needle = normalizeArabic(query);
  const matches = index.filter(
    (e) => e.book === book && normalizeArabic(e.text).includes(needle)
  );
  const pageSize = info.pageSize;
  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
  const start = (page - 1) * pageSize;
  return {
    book: info.slug,
    bookNameArabic: info.nameArabic,
    page,
    pages: totalPages,
    items: matches.slice(start, start + pageSize).map((m) => ({ number: m.number, text: m.text })),
    source: "بحث في النص",
  };
}

// Look up a single hadith by its number within a book. Hadith pages are
// paginated at a fixed page size, so the containing page can be derived
// directly instead of scanning every page.
export async function getHadithByNumber(
  book: string,
  number: number
): Promise<{ item: { number: number; text: string }; page: HadithPage } | null> {
  const { books } = await getHadithIndex();
  const info = books.find((b) => b.slug === book);
  if (!info || number < 1 || number > info.total) return null;
  const pageNum = Math.ceil(number / info.pageSize);
  const page = await getHadithPage(book, pageNum);
  if (!page) return null;
  const item = page.items.find((h) => h.number === number);
  if (!item) return null;
  return { item, page };
}

// ---------- Azkar ----------
export async function getAzkar(): Promise<{
  categories: AzkarCategory[];
  source: string;
}> {
  return readJson("azkar/azkar.json");
}

// ---------- Dua ----------
export async function getDua(): Promise<{
  categories: DuaCategory[];
  source: string;
}> {
  return readJson("dua/dua.json");
}

// ---------- Names ----------
export async function getNamesOfAllah(): Promise<{
  names: AllahName[];
  source: string;
}> {
  return readJson("names/allah.json");
}

export async function getNamesOfProphet(): Promise<{
  names: ProphetName[];
  source: string;
}> {
  return readJson("names/prophet.json");
}
