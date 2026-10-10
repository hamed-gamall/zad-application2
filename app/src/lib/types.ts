// Core data models for زَادُ المُسْلِم
// These mirror the shape of the processed JSON files under /data,
// which were derived from the real source datasets (see /data/SOURCES.md).

export interface SurahMeta {
  place: "Mecca" | "Medina" | string;
  type: "Makkiyah" | "Madaniyah" | string;
  count: number;
  revelationOrder?: number;
  rukus?: number;
  title: string;
  titleAr: string;
  titleEn: string;
  index: string; // "001".."114"
  pages?: string;
  page?: string;
  start?: number;
  juz?: { index: string; verse: { start: string; end: string } }[];
}

export interface Verse {
  ayah: number;
  text: string;
}

export interface SurahText {
  number: number;
  nameArabic?: string;
  titleArabic: string;
  titleEnglish: string;
  titleTranslit: string;
  revelationPlace: string;
  revelationType: string;
  ayahCount: number;
  verses: Verse[];
  source: string;
}

export interface TafsirVerse {
  ayah: number;
  text: string;
}

export interface TafsirSurah {
  surah: number;
  verses: TafsirVerse[];
  source: string;
}

export interface HadithItem {
  number: number;
  text: string;
}

export interface HadithPage {
  book: string;
  bookNameArabic: string;
  page: number;
  pages: number;
  items: HadithItem[];
  source: string;
}

export interface HadithBookInfo {
  slug: string;
  nameArabic: string;
  total: number;
  pages: number;
  pageSize: number;
}

export interface AzkarItem {
  id: number;
  text: string;
  count: number;
  audio: string | null;
}

export interface AzkarCategory {
  id: number;
  category: string;
  audio: string | null;
  items: AzkarItem[];
}

export interface DuaItem {
  text: string;
  count?: string | number;
  reference?: string;
  description?: string;
}

export interface DuaCategory {
  category: string;
  items: DuaItem[];
}

export interface AllahName {
  number: number;
  translation: string;
  meaning: string;
  audio: string;
}

export interface ProphetName {
  name: string;
}

export interface JuzBoundary {
  index: string;
  verse: string;
  name: string;
  nameAr: string;
}

export interface JuzMeta {
  index: string;
  start: JuzBoundary;
  end: JuzBoundary;
}

export interface SajdaMeta {
  index: string;
  suraIndex: string;
  verse: string;
  suraName: string;
  suraNameAr: string;
  obligatory: boolean;
}
