// Client-side helpers for the live, dynamic Islamic APIs.
// These are fetched at runtime in the user's browser (not bundled),
// per the brief: prayer times, qibla, hijri date, and reciter audio
// change/are too large to ship statically.

export interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Imsak?: string;
  Midnight?: string;
}

export interface AladhanTimingsResponse {
  code: number;
  data: {
    timings: PrayerTimings;
    date: {
      hijri: {
        date: string;
        day: string;
        month: { number: number; ar: string; en: string };
        year: string;
        weekday: { ar: string; en: string };
      };
      gregorian: { date: string; weekday: { en: string } };
    };
  };
}

const ALADHAN_BASE = "https://api.aladhan.com/v1";

export async function fetchPrayerTimes(
  lat: number,
  lon: number,
  method = 5 // Egyptian General Authority of Survey — common default
): Promise<AladhanTimingsResponse> {
  const ts = Math.floor(Date.now() / 1000);
  const url = `${ALADHAN_BASE}/timings/${ts}?latitude=${lat}&longitude=${lon}&method=${method}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("تعذّر جلب مواقيت الصلاة");
  return res.json();
}

export interface QiblaResponse {
  code: number;
  data: { latitude: number; longitude: number; direction: number };
}

export async function fetchQibla(
  lat: number,
  lon: number
): Promise<QiblaResponse> {
  const url = `${ALADHAN_BASE}/qibla/${lat}/${lon}`;
  const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 30 } }); // 30 days — a fixed geometric fact
  if (!res.ok) throw new Error("تعذّر حساب اتجاه القبلة");
  return res.json();
}

export interface HijriCalendarDay {
  date: {
    hijri: {
      date: string;
      day: string;
      month: { ar: string; number: number };
      year: string;
      holidays: string[];
    };
    gregorian: { date: string; day: string };
  };
}

export async function fetchHijriCalendarMonth(
  year: number,
  month: number,
  lat: number,
  lon: number
): Promise<{ code: number; data: HijriCalendarDay[] }> {
  const url = `${ALADHAN_BASE}/calendar/${year}/${month}?latitude=${lat}&longitude=${lon}&method=5`;
  const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 7 } }); // weekly is plenty for a published calendar
  if (!res.ok) throw new Error("تعذّر جلب التقويم الهجري");
  return res.json();
}

// Single-date Gregorian <-> Hijri conversion (date format "DD-MM-YYYY").
export interface HijriConversion {
  hijri: { day: string; month: { ar: string; number: number }; year: string; holidays: string[] };
  gregorian: { day: string; month: { en: string; number: number }; year: string; date: string };
}

// Aladhan expects a strict, zero-padded "DD-MM-YYYY" string — passing an
// unpadded value (e.g. "5-8-1447") is a common cause of the API silently
// misparsing the date and returning a wrong conversion.
function pad2(n: number | string) {
  return String(n).padStart(2, "0");
}
export function buildDateParam(day: number, month: number, year: number) {
  return `${pad2(day)}-${pad2(month)}-${year}`;
}

export async function gregorianToHijri(date: string): Promise<HijriConversion> {
  const res = await fetch(`${ALADHAN_BASE}/gToH/${date}`, { next: { revalidate: 60 * 60 * 24 * 30 } });
  if (!res.ok) throw new Error("تعذّر تحويل التاريخ");
  const json = await res.json();
  if (json.code !== 200 || !json.data) throw new Error("تعذّر تحويل التاريخ");
  return json.data;
}

export async function hijriToGregorian(date: string): Promise<HijriConversion> {
  const res = await fetch(`${ALADHAN_BASE}/hToG/${date}`, { next: { revalidate: 60 * 60 * 24 * 30 } });
  if (!res.ok) throw new Error("تعذّر تحويل التاريخ");
  const json = await res.json();
  if (json.code !== 200 || !json.data) throw new Error("تعذّر تحويل التاريخ");
  return json.data;
}

// ---------- Arabic names & Islamic-occasion helpers ----------

// Aladhan returns Gregorian month names in English only ("month.en");
// this maps them to Arabic for display, indexed by month number (1-12).
export const ARABIC_GREGORIAN_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export const HIJRI_MONTHS = [
  "محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
  "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة",
];

export function arabicGregorianMonth(monthNumber: number): string {
  return ARABIC_GREGORIAN_MONTHS[monthNumber - 1] ?? "";
}

// Aladhan reports Islamic-calendar holidays in English (and sometimes with
// inconsistent naming). This maps the known occasions to a clean Arabic
// name plus a short, occasion-appropriate greeting.
const HOLIDAY_MAP: { match: RegExp; ar: string; greeting: string }[] = [
  { match: /isra.*mi'?raj|al-?isra/i, ar: "ليلة الإسراء والمعراج", greeting: "بارك الله لكم في ذكرى الإسراء والمعراج" },
  { match: /nisf|mid.*sha.?ban/i, ar: "ليلة النصف من شعبان", greeting: "تقبل الله منكم القيام والدعاء في ليلة النصف من شعبان" },
  { match: /beginning of ramadan|ramadan start|start of ramadan|1 ramadan/i, ar: "بداية شهر رمضان المبارك", greeting: "رمضان مبارك، تقبل الله منا ومنكم الصيام والقيام" },
  { match: /nuzul/i, ar: "ذكرى نزول القرآن الكريم", greeting: "بارك الله لكم في ذكرى نزول القرآن الكريم" },
  { match: /qadr/i, ar: "ليلة القدر", greeting: "تقبل الله منكم القيام والدعاء في ليلة القدر" },
  { match: /eid.*fitr|fitr/i, ar: "عيد الفطر المبارك", greeting: "عيد فطر مبارك، كل عام وأنتم بخير" },
  { match: /arafat|hajj day|day of hajj/i, ar: "يوم عرفة", greeting: "تقبل الله صيامكم ودعاءكم في يوم عرفة" },
  { match: /eid.*adha|adha/i, ar: "عيد الأضحى المبارك", greeting: "عيد أضحى مبارك، كل عام وأنتم بخير" },
  { match: /ashura/i, ar: "يوم عاشوراء", greeting: "تقبل الله صيامكم في يوم عاشوراء" },
  { match: /new\s*year|hijri new year|1 muharram/i, ar: "رأس السنة الهجرية", greeting: "كل عام وأنتم بخير بمناسبة العام الهجري الجديد" },
  { match: /mawlid|prophet.*birthday/i, ar: "المولد النبوي الشريف", greeting: "أفضل الصلاة وأتم التسليم على سيدنا محمد صلى الله عليه وسلم" },
];

export interface TranslatedOccasion {
  name: string;
  greeting: string;
}

export function translateHolidays(holidays: string[]): TranslatedOccasion[] {
  const results: TranslatedOccasion[] = [];
  for (const h of holidays) {
    const found = HOLIDAY_MAP.find((entry) => entry.match.test(h));
    // Aladhan's holiday list includes many extra commemorations beyond the
    // main Islamic occasions (e.g. specific Sufi-order "Urs"/anniversary
    // days) which aren't relevant here — anything we don't explicitly
    // recognize and translate is dropped rather than shown untranslated.
    if (found) results.push({ name: found.ar, greeting: found.greeting });
  }
  return results;
}

// ---------- mp3quran.net reciters ----------
export interface MoshafInfo {
  id: number;
  name: string;
  server: string;
  surah_total: number;
  surah_list: string; // comma separated surah numbers available
  moshaf_type: number;
}

export interface ReciterInfo {
  id: number;
  name: string;
  letter: string;
  moshaf: MoshafInfo[];
}

export async function fetchReciters(): Promise<ReciterInfo[]> {
  const res = await fetch(
    "https://www.mp3quran.net/api/v3/reciters?language=ar",
    // Matches the page's `export const revalidate = 86400` — without this,
    // Next.js 16 fetches are uncached by default, so this several-hundred-
    // reciter response was being fetched live from mp3quran.net on every
    // single visit to /reciters instead of once a day. This was very
    // likely the main cause of that page feeling slow to open.
    { next: { revalidate: 60 * 60 * 24 } }
  );
  if (!res.ok) throw new Error("تعذّر جلب قائمة القرّاء");
  const json = await res.json();
  return json.reciters as ReciterInfo[];
}

export function surahAudioUrl(serverBase: string, surahNumber: number) {
  const padded = String(surahNumber).padStart(3, "0");
  const base = serverBase.endsWith("/") ? serverBase : serverBase + "/";
  return `${base}${padded}.mp3`;
}

// Formats an Aladhan "HH:MM" (24h) time string as 12-hour Arabic time, e.g.
// "17:05" -> "5:05 م".
export function formatTime12h(time24: string) {
  const [hStr, mStr] = time24.slice(0, 5).split(":");
  let h = Number(hStr);
  const period = h >= 12 ? "م" : "ص";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${period}`;
}

// ---------- lightweight client-side cache ----------
// `next: { revalidate }` (used above) only applies to fetches made in a
// Server Component — it's a silent no-op for fetches made from client
// components like RadioBrowser. Client-fetched lists like the radio
// stations were re-downloading from scratch (and showing a blank "جارٍ
// التحميل" state) on every single visit within the same app session; this
// gives them a short sessionStorage cache instead so revisiting a page
// feels instant, matching how the reciters/hijri/qibla data is now cached
// on the server side above.
function cachedClientFetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw) {
        const { data, at } = JSON.parse(raw) as { data: T; at: number };
        if (Date.now() - at < ttlMs) return Promise.resolve(data);
      }
    } catch {
      /* corrupted/unavailable cache entry — fall through to a real fetch */
    }
  }
  return fetcher().then((data) => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(key, JSON.stringify({ data, at: Date.now() }));
      } catch {
        /* storage full/unavailable — not fatal, just no caching this time */
      }
    }
    return data;
  });
}

// ---------- Live Quran radio stations ----------
export interface RadioStation {
  id: number;
  name: string;
  url: string;
  /** Not every source (mp3quran.net's radios API, in particular) provides a
   * station image — the UI falls back to a generic icon when this is absent. */
  img?: string;
  /**
   * Android-app-only: this station's stream must be played via native
   * ExoPlayer instead of the shared web &lt;audio&gt; element (see
   * MediaPlaybackService.java for the exact reason — RadioJar's edge
   * sometimes redirects this specific stream from https:// to a different
   * host over http://, which a WebView &lt;audio&gt; element refuses to
   * follow as a mixed-content violation, exactly like a browser would).
   * Ignored on the plain website, where this station already plays fine
   * through the normal player.
   */
  nativePlayback?: boolean;
}

// Android blocks plain http:// media requests by default since API 28 (the
// app here targets a much newer SDK, so this is not optional/configurable
// away). Almost every Icecast/Shoutcast-style Quran radio server also serves
// https on the same host, so upgrading the scheme here is a safe default.
function toPlayableStreamUrl(url: string): string {
  return url.startsWith("http://") ? "https://" + url.slice("http://".length) : url;
}

// mp3quran.net's own radios directory: the same official, freely-documented
// API this app already relies on for reciters (see fetchReciters below) and
// for individual surah recordings elsewhere. Its stream URLs are plain,
// permanent https links with no short-lived signed token attached (unlike
// the earlier data-rosy.vercel.app/radio.json feed this app used to pull
// from, whose Radiojar-hosted entries carried an rj-tok/rj-ttl pair that
// expired mid-session — the actual cause of the old "connects, drops,
// endless retry" symptom). That old feed has since been dropped entirely in
// favor of this one.
const MP3QURAN_RADIOS_API = "https://www.mp3quran.net/api/v3/radios?language=ar";

// mp3quran.net's directory doesn't include a dedicated "إذاعة القرآن الكريم
// من القاهرة" (Egyptian State Radio's Quran channel) entry, so it's added by
// hand here with a negative id (guaranteed to never collide with an id from
// the API above) and always kept first in the list.
const EXTRA_STATIONS: RadioStation[] = [
  {
    id: -1,
    name: "إذاعة القرآن الكريم من القاهرة",
    url: "https://stream.radiojar.com/8s5u5tpdtwzuv",
    nativePlayback: true,
  },
];

async function loadRadioStations(fresh: boolean): Promise<RadioStation[]> {
  const res = await fetch(
    MP3QURAN_RADIOS_API,
    // A forced refresh bypasses any HTTP cache the browser/WebView keeps
    // for this exact URL, so a manual retry after a failure is a genuine
    // new request rather than a cached repeat of the same response.
    fresh ? { cache: "no-store" } : undefined
  );
  if (!res.ok) throw new Error("تعذّر جلب قائمة الإذاعات القرآنية");
  const json = await res.json();
  const apiStations = (json.radios as RadioStation[]).map((r) => ({
    ...r,
    name: r.name.trim(),
    url: toPlayableStreamUrl(r.url),
  }));
  return [...EXTRA_STATIONS, ...apiStations];
}

export async function fetchRadioStations(): Promise<RadioStation[]> {
  return cachedClientFetch("zad:radio-stations", 5 * 60 * 1000, () => loadRadioStations(false));
}

/**
 * Re-fetches the live station list, bypassing every cache (see
 * `loadRadioStations`), and returns just the freshest playable stream URL
 * for one station. Used to recover a live-radio reconnect that keeps
 * failing on its current URL — e.g. a station's stream host moved or is
 * mid-restart — by getting a clean copy of the directory instead of
 * retrying the exact same URL forever.
 */
export async function fetchFreshRadioStreamUrl(stationId: number): Promise<string | null> {
  // The hand-added stations above aren't served by the API, so there is
  // nothing to "refresh" for them — just hand back the same fixed URL.
  const extra = EXTRA_STATIONS.find((s) => s.id === stationId);
  if (extra) return extra.url;
  try {
    const stations = await loadRadioStations(true);
    return stations.find((s) => s.id === stationId)?.url ?? null;
  } catch {
    return null;
  }
}

// ---------- Mushaf page images ----------
// Source: https://www.mp3quran.net/mushaf2/ — the standard 604-page Uthmani
// mushaf, served as plain JPG images named "1.jpg", "2.jpg", ... (no zero
// padding). On this source the image numbering is offset by one page — the
// ornamental opening page is image 1.jpg, and Surah Al-Fatiha (mushaf page 1)
// is image 2.jpg — so every internal page number (matching the standard
// printed mushaf numbering used elsewhere in the app, e.g. surah start
// pages) is shifted by +1 when building the image URL.
export const TOTAL_MUSHAF_PAGES = 604;
const MUSHAF_IMAGE_BASE = "https://www.mp3quran.net/mushaf2";

export function mushafPageImageUrl(page: number): string {
  const clamped = Math.min(Math.max(page, 1), TOTAL_MUSHAF_PAGES);
  const imageIndex = clamped + 1; // offset: Al-Fatiha (page 1) => image 2.jpg
  return `${MUSHAF_IMAGE_BASE}/${imageIndex}.jpg`;
}

export async function getBrowserCoords(): Promise<{ coords: { latitude: number; longitude: number } }> {
  const { getSavedLocation, detectLocation } = await import("./location");
  const saved = getSavedLocation();
  // A typed place, or a GPS fix from the last 10 minutes, is used as-is.
  const l = saved && (saved.source === "manual" || Date.now() - saved.at < 10 * 60 * 1000) ? saved : await detectLocation();
  return { coords: { latitude: l.lat, longitude: l.lon } };
}
