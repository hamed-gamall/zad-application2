// Local-only persistence (no account, no server). Every helper is
// defensive about SSR / storage errors (private browsing, quota, etc).

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — silently ignore */
  }
}

// ---------- Quran bookmarks ----------
export interface QuranBookmark {
  surah: number;
  ayah: number;
  surahName: string;
  savedAt: number;
}
const BOOKMARKS_KEY = "zad:quran:bookmarks";

export function getBookmarks(): QuranBookmark[] {
  return safeGet(BOOKMARKS_KEY, []);
}
export function toggleBookmark(bm: QuranBookmark): QuranBookmark[] {
  const list = getBookmarks();
  const idx = list.findIndex((b) => b.surah === bm.surah && b.ayah === bm.ayah);
  const next = idx >= 0 ? list.filter((_, i) => i !== idx) : [...list, bm];
  safeSet(BOOKMARKS_KEY, next);
  return next;
}
export function isBookmarked(surah: number, ayah: number): boolean {
  return getBookmarks().some((b) => b.surah === surah && b.ayah === ayah);
}

// ---------- Reading progress (last read position) ----------
export interface ReadingProgress {
  surah: number;
  ayah: number;
  updatedAt: number;
}
const PROGRESS_KEY = "zad:quran:progress";
export function getProgress(): ReadingProgress | null {
  return safeGet(PROGRESS_KEY, null);
}
export function setProgress(p: ReadingProgress) {
  safeSet(PROGRESS_KEY, p);
}

// ---------- Mushaf-page reading progress (for the "pages/images" mode) ----------
export interface PageProgress {
  page: number;
  updatedAt: number;
}
const PAGE_PROGRESS_KEY = "zad:quran:page-progress";
export function getPageProgress(): PageProgress | null {
  return safeGet(PAGE_PROGRESS_KEY, null);
}
export function setPageProgress(p: PageProgress) {
  safeSet(PAGE_PROGRESS_KEY, p);
}

// ---------- Mushaf-page bookmarks (for the "pages/images" mode) ----------
export interface PageBookmark {
  page: number;
  surah?: number; // nearest surah number, so the bookmark can link back into /quran/[surah]
  savedAt: number;
}
const PAGE_BOOKMARKS_KEY = "zad:quran:page-bookmarks";
export function getPageBookmarks(): PageBookmark[] {
  return safeGet(PAGE_BOOKMARKS_KEY, []);
}
export function togglePageBookmark(page: number, surah?: number): PageBookmark[] {
  const list = getPageBookmarks();
  const idx = list.findIndex((b) => b.page === page);
  const next = idx >= 0 ? list.filter((_, i) => i !== idx) : [...list, { page, surah, savedAt: Date.now() }];
  safeSet(PAGE_BOOKMARKS_KEY, next);
  return next;
}
export function isPageBookmarked(page: number): boolean {
  return getPageBookmarks().some((b) => b.page === page);
}

// ---------- Reading preferences ----------
export interface ReadingPrefs {
  fontSize: number; // px baseline for verse text
  tafsirId: "muyassar" | "saadi" | "e3rab" | "jalalayn" | "qurtubi" | "waseet" | "baghawi" | "tanwir" | "none";
  showTranslation: boolean;
  reciterServer: string | null;
  reciterName: string | null;
  ayahReciterEdition: string; // everyayah.com folder name, used for single-ayah playback
  readingMode: "scroll" | "pages"; // "scroll" = text reader, "pages" = mushaf page images
}
const PREFS_KEY = "zad:quran:prefs";
export const DEFAULT_PREFS: ReadingPrefs = {
  fontSize: 28,
  tafsirId: "none",
  showTranslation: false,
  reciterServer: null,
  reciterName: null,
  ayahReciterEdition: "Alafasy_128kbps",
  readingMode: "scroll",
};
export function getPrefs(): ReadingPrefs {
  return { ...DEFAULT_PREFS, ...safeGet(PREFS_KEY, {}) };
}
export function setPrefs(p: Partial<ReadingPrefs>) {
  safeSet(PREFS_KEY, { ...getPrefs(), ...p });
}

// ---------- Dua / Hadith favorites ----------
export interface FavoriteItem {
  id: string; // unique key, e.g. `dua:<category>:<index>`
  type: "dua" | "hadith" | "azkar" | "audio" | "radio";
  label: string;
  text: string;
  savedAt: number;
  href?: string; // for non-text favorites (e.g. audio), where to navigate on "open"
}
const FAVORITES_KEY = "zad:favorites";
export function getFavorites(): FavoriteItem[] {
  return safeGet(FAVORITES_KEY, []);
}
export function toggleFavorite(item: FavoriteItem): FavoriteItem[] {
  const list = getFavorites();
  const idx = list.findIndex((f) => f.id === item.id);
  const next = idx >= 0 ? list.filter((_, i) => i !== idx) : [...list, item];
  safeSet(FAVORITES_KEY, next);
  return next;
}
export function isFavorite(id: string): boolean {
  return getFavorites().some((f) => f.id === id);
}

// ---------- Tasbih counters (persist per-dhikr count across sessions) ----------
const TASBIH_KEY = "zad:tasbih:total";
export function getTasbihTotal(): number {
  return safeGet(TASBIH_KEY, 0);
}
export function addTasbih(n = 1): number {
  const total = getTasbihTotal() + n;
  safeSet(TASBIH_KEY, total);
  return total;
}
export function resetTasbih() {
  safeSet(TASBIH_KEY, 0);
}

// ---------- Theme ----------
const THEME_KEY = "zad:theme";
export function getTheme(): "light" | "dark" {
  return safeGet(THEME_KEY, "light");
}
export function setTheme(t: "light" | "dark") {
  safeSet(THEME_KEY, t);
}

// ---------- App-wide appearance settings (theme, font family, font size) ----------
export type AppThemeId = "manuscript" | "night" | "sahara" | "emerald" | "andalusi";
export type AppFontId = "cairo" | "amiri" | "tajawal";

export interface AppSettings {
  theme: AppThemeId;
  font: AppFontId;
  fontScale: number; // 0.9 - 1.3, applied as a root font-size multiplier
}

const APP_SETTINGS_KEY = "zad:app-settings";
export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: "manuscript",
  font: "cairo",
  fontScale: 1,
};

export function getAppSettings(): AppSettings {
  return { ...DEFAULT_APP_SETTINGS, ...safeGet<Partial<AppSettings>>(APP_SETTINGS_KEY, {}) };
}

export function setAppSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getAppSettings(), ...patch };
  safeSet(APP_SETTINGS_KEY, next);
  return next;
}

export function applyAppSettings(s: AppSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", s.theme);
  root.setAttribute("data-font", s.font);
  root.style.setProperty("--app-font-scale", String(s.fontScale));
}

// ---------- Custom tasbih phrases (user-added dhikr, persisted locally) ----------
export interface CustomTasbihPhrase {
  id: string;
  text: string;
  target: number;
}
const CUSTOM_TASBIH_KEY = "zad:tasbih:custom-phrases";
export function getCustomTasbihPhrases(): CustomTasbihPhrase[] {
  return safeGet(CUSTOM_TASBIH_KEY, []);
}
export function addCustomTasbihPhrase(text: string, target = 33): CustomTasbihPhrase[] {
  const list = getCustomTasbihPhrases();
  const next = [...list, { id: `${Date.now()}`, text: text.trim(), target }];
  safeSet(CUSTOM_TASBIH_KEY, next);
  return next;
}
export function removeCustomTasbihPhrase(id: string): CustomTasbihPhrase[] {
  const next = getCustomTasbihPhrases().filter((p) => p.id !== id);
  safeSet(CUSTOM_TASBIH_KEY, next);
  return next;
}

// ---------- Selected reciter's own last-tapped tasbih preset (kept across visits) ----------
const TASBIH_SELECTED_KEY = "zad:tasbih:selected";
export function getSelectedTasbih(): string | null {
  return safeGet<string | null>(TASBIH_SELECTED_KEY, null);
}
export function setSelectedTasbih(id: string) {
  safeSet(TASBIH_SELECTED_KEY, id);
}
