import { getSurahList, getSurahText, getHadithPage, getHadithIndex, getDua } from "@/lib/data";

export interface DailyContent {
  slot: number;
  ayah: { surahNumber: number; surahTitleAr: string; ayahNumber: number; text: string };
  hadith: { bookSlug: string; bookNameArabic: string; number: number; text: string };
  dua: { category: string; text: string };
}

/**
 * Content of the day rotates through the whole Quran / hadith corpus / duas
 * using a "slot" number that increases by 1 every 6 hours (4 slots/day), so
 * the same content appears for a full quarter-day window, then rotates.
 */
export async function getDailyContent(slot: number): Promise<DailyContent> {
  const safeSlot = Math.max(0, Math.floor(slot));

  const surahList = await getSurahList();
  const surahIdx = safeSlot % surahList.length;
  const surahMeta = surahList[surahIdx];
  const surahNumber = surahIdx + 1;
  const surahText = await getSurahText(surahNumber);
  const ayahIdx = safeSlot % surahText.verses.length;
  const ayahOfDay = surahText.verses[ayahIdx];

  // Rotate across the *entire* hadith book (not just its first page) so the
  // same handful of hadiths don't repeat every few weeks.
  const { books: hadithBooks } = await getHadithIndex();
  const bookInfo = hadithBooks[safeSlot % hadithBooks.length];
  const hadithNumber = (safeSlot % bookInfo.total) + 1;
  const hadithPageNum = Math.ceil(hadithNumber / bookInfo.pageSize);
  const hadithPage = await getHadithPage(bookInfo.slug, hadithPageNum);
  const hadithOfDay = hadithPage?.items.find((h) => h.number === hadithNumber);

  const duaData = await getDua();
  const duaCatIdx = safeSlot % duaData.categories.length;
  const duaCat = duaData.categories[duaCatIdx];
  const duaOfDay = duaCat.items[safeSlot % duaCat.items.length];

  return {
    slot: safeSlot,
    ayah: {
      surahNumber,
      surahTitleAr: surahMeta.titleAr,
      ayahNumber: ayahOfDay.ayah,
      text: ayahOfDay.text,
    },
    hadith: {
      bookSlug: bookInfo.slug,
      bookNameArabic: bookInfo.nameArabic,
      number: hadithOfDay?.number ?? hadithNumber,
      text: hadithOfDay?.text ?? "",
    },
    dua: {
      category: duaCat.category,
      text: duaOfDay.text,
    },
  };
}

/** Slot number computed from UTC — used only as the initial server-rendered
 * fallback before the browser corrects it to the visitor's own local time. */
export function utcContentSlot(): number {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const diff = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - start;
  const daysSinceYearStart = Math.floor(diff / 86400000);
  const quarterOfDay = Math.floor(now.getUTCHours() / 6);
  return daysSinceYearStart * 4 + quarterOfDay;
}
