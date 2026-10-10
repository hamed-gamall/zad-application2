"use client";

import { useEffect, useMemo, useState } from "react";
import {
  gregorianToHijri,
  hijriToGregorian,
  buildDateParam,
  arabicGregorianMonth,
  translateHolidays,
  ARABIC_GREGORIAN_MONTHS,
  HIJRI_MONTHS,
  type HijriConversion,
} from "@/lib/live";
import { ArrowLeftRightIcon } from "@/components/icons/Icons";

function todayStr() {
  const d = new Date();
  return buildDateParam(d.getDate(), d.getMonth() + 1, d.getFullYear());
}

const DAYS_31 = Array.from({ length: 31 }, (_, i) => i + 1);
const DAYS_30 = Array.from({ length: 30 }, (_, i) => i + 1);
const CURRENT_G_YEAR = new Date().getFullYear();

export default function HijriCalendarClient() {
  // --- Today card ---
  const [today, setToday] = useState<HijriConversion | null>(null);
  const [todayError, setTodayError] = useState(false);

  useEffect(() => {
    gregorianToHijri(todayStr())
      .then(setToday)
      .catch(() => setTodayError(true));

    // The date itself only actually changes once a day, so this checks the
    // local calendar day every second (cheap) but only re-fetches from the
    // API on the rare tick where the day has truly flipped — that way the
    // card corrects itself automatically at midnight without needing a
    // manual page refresh, and without spamming the free API every second.
    let lastDateKey = new Date().toDateString();
    const id = setInterval(() => {
      const key = new Date().toDateString();
      if (key !== lastDateKey) {
        lastDateKey = key;
        gregorianToHijri(todayStr())
          .then(setToday)
          .catch(() => setTodayError(true));
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // --- Date converter: the user picks day/month/year directly from
  // dedicated fields (no native Gregorian date-picker, since that widget
  // can't represent a Hijri date and was the main source of wrong results) ---
  const [mode, setMode] = useState<"g2h" | "h2g">("g2h");
  const now = useMemo(() => new Date(), []);
  const [day, setDay] = useState(now.getDate());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [converted, setConverted] = useState<HijriConversion | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  function switchMode() {
    setConverted(null);
    setConvertError(null);
    if (mode === "g2h") {
      // Moving to Hijri input — seed with today's Hijri date if we have it.
      setMode("h2g");
      if (today) {
        setDay(Number(today.hijri.day));
        setMonth(today.hijri.month.number);
        setYear(Number(today.hijri.year));
      } else {
        setDay(1);
        setMonth(1);
        setYear(1447);
      }
    } else {
      setMode("g2h");
      const n = new Date();
      setDay(n.getDate());
      setMonth(n.getMonth() + 1);
      setYear(n.getFullYear());
    }
  }

  async function convert(e: React.FormEvent) {
    e.preventDefault();
    setConvertError(null);
    setConverting(true);
    try {
      const formatted = buildDateParam(day, month, year);
      const result = mode === "g2h" ? await gregorianToHijri(formatted) : await hijriToGregorian(formatted);
      setConverted(result);
    } catch {
      setConvertError("تعذّر تحويل هذا التاريخ. تحقق من صحة اليوم والشهر والسنة ثم حاول مرة أخرى.");
    } finally {
      setConverting(false);
    }
  }

  const dayOptions = mode === "g2h" ? DAYS_31 : DAYS_30;
  const monthNames = mode === "g2h" ? ARABIC_GREGORIAN_MONTHS : HIJRI_MONTHS;

  const todayOccasions = today ? translateHolidays(today.hijri.holidays) : [];
  const convertedOccasions = converted ? translateHolidays(converted.hijri.holidays) : [];

  const sel = "field !rounded-2xl !px-3 !py-3 text-sm";
  return (
    <div>
      {todayError && <p className="mx-6 rounded-3xl bg-white/[0.05] p-6 text-center text-sm text-gold-bright">تعذّر الاتصال بخدمة التقويم الهجري.</p>}
      {!today && !todayError && <p className="animate-pulse py-20 text-center text-sm text-[var(--muted-on-night)]">جارٍ التحميل…</p>}
      {today && !todayError && (
        <section className="relative isolate px-6 pb-10 pt-8 text-center">
          <div className="prayer-glow" aria-hidden />
          <svg aria-hidden viewBox="0 0 64 64" className="mx-auto mb-4 h-14 w-14"><path d="M44 8a24 24 0 1 0 12 30A20 20 0 0 1 44 8z" fill="#e3c987" /><path d="M50 14l1.6 3.4 3.4 1.6-3.4 1.6L50 24l-1.6-3.4-3.4-1.6 3.4-1.6z" fill="#e3c987" /></svg>
          <p className="text-sm text-[var(--muted-on-night)]">{new Date().toLocaleDateString("ar", { weekday: "long" })}</p>
          <p className="font-display text-8xl leading-tight tabular-nums text-gold-bright">{Number(today.hijri.day).toLocaleString("ar-EG")}</p>
          <p className="font-display text-4xl text-[var(--ivory)]">{today.hijri.month.ar} {Number(today.hijri.year).toLocaleString("ar-EG")} هـ</p>
          <p className="mt-3 text-sm text-[var(--muted-on-night)]">الموافق {today.gregorian.day} {arabicGregorianMonth(today.gregorian.month.number)} {today.gregorian.year}م</p>
          {todayOccasions.length > 0 && (
            <div className="mt-5 flex flex-col items-center gap-3">
              {todayOccasions.map((o) => (
                <div key={o.name}><span className="inline-block rounded-full bg-gold/15 px-5 py-2 text-sm font-semibold text-gold-bright">{o.name}</span>{o.greeting && <p className="mt-1 text-xs text-[var(--muted-on-night)]">{o.greeting}</p>}</div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mx-6 mt-2 rounded-[28px] glass p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl text-[var(--ivory)]">تحويل التاريخ</h2>
          <button onClick={switchMode} className="chip focus-ring gap-1.5"><ArrowLeftRightIcon size={14} />{mode === "g2h" ? "ميلادي ← هجري" : "هجري ← ميلادي"}</button>
        </div>
        <p className="mb-3 text-xs text-[var(--muted-on-night)]">{mode === "g2h" ? "أدخل التاريخ الميلادي" : "أدخل التاريخ الهجري"}</p>
        <form onSubmit={convert} className="grid grid-cols-[4.5rem_1fr_6rem] gap-2">
          <select value={day} onChange={(e) => setDay(Number(e.target.value))} className={sel} aria-label="اليوم">{dayOptions.map((d) => <option key={d} value={d}>{d}</option>)}</select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={sel} aria-label="الشهر">{monthNames.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}</select>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} min={mode === "g2h" ? 1937 : 1300} max={mode === "g2h" ? CURRENT_G_YEAR + 50 : 1500} className={sel} aria-label="السنة" />
          <button type="submit" disabled={converting} className="pressable focus-ring col-span-3 mt-1 h-12 rounded-full bg-gradient-to-l from-gold-bright to-gold font-semibold text-[#1a1407] disabled:opacity-60">{converting ? "جارٍ التحويل…" : "تحويل"}</button>
        </form>
        {convertError && <p className="mt-3 text-sm text-gold-bright" role="alert">{convertError}</p>}
        {converted && (
          <div className="mt-5 rounded-2xl bg-white/[0.05] p-5 text-center">
            <p className="font-display text-3xl text-[var(--ivory)]">{converted.hijri.day} {converted.hijri.month.ar} {converted.hijri.year}هـ</p>
            <p className="mt-1 text-sm text-[var(--muted-on-night)]">الموافق {converted.gregorian.day} {arabicGregorianMonth(converted.gregorian.month.number)} {converted.gregorian.year}م</p>
            {convertedOccasions.map((o) => <p key={o.name} className="mt-2 text-sm text-gold-bright">{o.name}{o.greeting ? ` — ${o.greeting}` : ""}</p>)}
          </div>
        )}
      </section>
    </div>
  );
}
