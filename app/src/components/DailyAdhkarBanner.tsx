"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getBrowserCoords, fetchPrayerTimes } from "@/lib/live";
import { findCalculationMethod, type CalculationMethodId } from "@/lib/prayerMethods";
import { getNotificationSettings } from "@/lib/notifications/settings";

type Slot = "morning" | "evening" | null;

const CACHE_KEY = "zad:adhkar-times-cache";

// أذكار الصباح تبدأ من صلاة الفجر وحتى صلاة الظهر، وأذكار المساء تبدأ من
// صلاة العصر وحتى صلاة المغرب. تُجلب مواقيت الصلاة الفعلية بحسب موقع
// المستخدم وطريقة الحساب المحفوظة (نفس الاختيار الموجود في تنبيهات الأذان)،
// وتُخزَّن مؤقتًا لبقية اليوم لتفادي طلبات متكررة، مع الرجوع إلى توقيت
// تقريبي ثابت إذا تعذّر الوصول للموقع أو لخدمة المواقيت.
function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function slotFromFallback(): Slot {
  const mins = nowMinutes();
  if (mins >= 4 * 60 && mins < 12 * 60) return "morning";
  if (mins >= 15 * 60 && mins < 18 * 60 + 30) return "evening";
  return null;
}

function slotFromTimes(fajr: string, dhuhr: string, asr: string, maghrib: string): Slot {
  const mins = nowMinutes();
  const fajrM = timeToMinutes(fajr);
  const dhuhrM = timeToMinutes(dhuhr);
  const asrM = timeToMinutes(asr);
  const maghribM = timeToMinutes(maghrib);
  if (mins >= fajrM && mins < dhuhrM) return "morning";
  if (mins >= asrM && mins < maghribM) return "evening";
  return null;
}

interface CachedTimes {
  date: string;
  // Which calculation method these times were computed with — a cached
  // entry from a different method (even from earlier today) is stale the
  // instant the person changes it, not just at midnight.
  method: CalculationMethodId;
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
}

export default function DailyAdhkarBanner() {
  const [slot, setSlot] = useState<Slot>(null);
  const [times, setTimes] = useState<CachedTimes | null>(null);

  // Same live-update mechanism as PrayerTimesClient.tsx/PrayerRing.tsx: keep
  // the last known coordinates so a calculation-method change elsewhere on
  // the site (see setNotificationSettings, which broadcasts
  // "zad:calc-method-changed") can be picked up here instantly, with a
  // quick re-fetch instead of a fresh geolocation prompt.
  const lastCoordsRef = useRef<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    const today = new Date().toDateString();

    function fetchAndCache(lat: number, lon: number, method: CalculationMethodId) {
      lastCoordsRef.current = { lat, lon };
      return fetchPrayerTimes(lat, lon, findCalculationMethod(method).aladhanId).then((res) => {
        const t = res.data.timings;
        const fresh: CachedTimes = {
          date: today,
          method,
          fajr: t.Fajr,
          dhuhr: t.Dhuhr,
          asr: t.Asr,
          maghrib: t.Maghrib,
        };
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
        } catch {
          /* storage may be unavailable; not critical */
        }
        setTimes(fresh);
      });
    }

    const method = getNotificationSettings().calculationMethod;

    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: CachedTimes = JSON.parse(raw);
        if (cached.date === today && cached.method === method) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setTimes(cached);
          return;
        }
      }
    } catch {
      /* ignore malformed cache */
    }

    getBrowserCoords()
      .then((pos) => fetchAndCache(pos.coords.latitude, pos.coords.longitude, method))
      .catch(() => setTimes(null));

    function onMethodChanged(e: Event) {
      const detail = (e as CustomEvent<{ calculationMethod: CalculationMethodId }>).detail;
      if (!detail || !lastCoordsRef.current) return;
      fetchAndCache(lastCoordsRef.current.lat, lastCoordsRef.current.lon, detail.calculationMethod).catch(() => {
        /* keep showing the previous times rather than blanking the banner */
      });
    }
    window.addEventListener("zad:calc-method-changed", onMethodChanged);
    return () => window.removeEventListener("zad:calc-method-changed", onMethodChanged);
  }, []);

  useEffect(() => {
    function update() {
      setSlot(times ? slotFromTimes(times.fajr, times.dhuhr, times.asr, times.maghrib) : slotFromFallback());
    }
    update();
    // Checked every second so the switch to/from the morning or evening
    // window happens right on time without needing a page refresh.
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [times]);

  if (!slot) return null;

  const isMorning = slot === "morning";

  return (
    <section className="px-5 pb-4">
      <Link href="/azkar/1" className="pressable focus-ring flex items-center gap-4 rounded-[26px] glass px-5 py-4">
        <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-bright">
          {isMorning
            ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></svg>
            : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-display block text-xl text-[var(--ivory)]">{isMorning ? "حان وقت أذكار الصباح" : "حان وقت أذكار المساء"}</span>
          <span className="block text-xs text-[var(--muted-on-night)]">{isMorning ? "ابدأ يومك بالمأثور" : "اختم نهارك بالمأثور"}</span>
        </span>
        <span aria-hidden className="text-gold-bright">←</span>
      </Link>
    </section>
  );
}
