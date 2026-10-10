"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUserLocation } from "@/components/useUserLocation";
import { fetchPrayerTimes, formatTime12h, type PrayerTimings } from "@/lib/live";
import { findCalculationMethod, type CalculationMethodId } from "@/lib/prayerMethods";
import { getNotificationSettings } from "@/lib/notifications/settings";

const PRAYERS: { key: keyof PrayerTimings; label: string }[] = [
  { key: "Fajr", label: "الفجر" },
  { key: "Dhuhr", label: "الظهر" },
  { key: "Asr", label: "العصر" },
  { key: "Maghrib", label: "المغرب" },
  { key: "Isha", label: "العشاء" },
];

const toMin = (t: string) => {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
};
const pad = (n: number) => String(n).padStart(2, "0");

// The next prayer is the moment: big name, big time, a live countdown and a
// day-arc showing where "now" sits between the prayers. No card around it.
export default function PrayerHero() {
  const [timings, setTimings] = useState<PrayerTimings | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const { loc, busy, error: locError, refresh } = useUserLocation();
  const [method, setMethod] = useState<CalculationMethodId>("egyptian");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMethod(getNotificationSettings().calculationMethod);
    const onChanged = (e: Event) => {
      const d = (e as CustomEvent<{ calculationMethod: CalculationMethodId }>).detail;
      if (d) setMethod(d.calculationMethod);
    };
    window.addEventListener("zad:calc-method-changed", onChanged);
    return () => window.removeEventListener("zad:calc-method-changed", onChanged);
  }, []);

  useEffect(() => {
    if (!loc) return;
    let cancelled = false;
    fetchPrayerTimes(loc.lat, loc.lon, findCalculationMethod(method).aladhanId)
      .then((res) => {
        if (cancelled) return;
        setTimings(res.data.timings);
        setFetchFailed(false);
      })
      .catch(() => !cancelled && setFetchFailed(true));
    return () => {
      cancelled = true;
    };
  }, [loc, method]);

  const error = fetchFailed;
  const placeLabel = loc ? loc.label + (loc.source === "ip" ? " (تقريبي)" : "") : busy ? "جارٍ تحديد موقعك…" : "";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  let view: { label: string; time: string; countdown: string; idx: number; progress: number } | null = null;
  if (timings && now) {
    const marks = PRAYERS.map((p) => ({ ...p, m: toMin(timings[p.key] as string) }));
    const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    let cur = -1;
    marks.forEach((x, i) => {
      if (nowSec >= x.m * 60) cur = i;
    });
    const nextI = (cur + 1) % marks.length;
    const next = marks[nextI];
    const diff = (next.m * 60 - nowSec + 86400) % 86400;
    const prevM = cur === -1 ? marks[marks.length - 1].m * 60 - 86400 : marks[cur].m * 60;
    const span = next.m * 60 + (next.m * 60 <= prevM ? 86400 : 0) - prevM;
    view = {
      label: next.label,
      time: formatTime12h(timings[next.key] as string),
      countdown: `${pad(Math.floor(diff / 3600))}:${pad(Math.floor((diff % 3600) / 60))}:${pad(diff % 60)}`,
      idx: nextI,
      progress: Math.min(1, Math.max(0, 1 - diff / span)),
    };
  }

  const R = 44;
  const C = 2 * Math.PI * R;

  return (
    <section className="relative px-5 pt-2" aria-live="polite">
      <Link href="/tools/prayer-times" className="pressable focus-ring glass block rounded-[30px] p-5">
        <div className="flex items-center gap-5">
          <div className="relative h-[100px] w-[100px] shrink-0">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(243,236,217,.12)" strokeWidth="4" />
              <circle cx="50" cy="50" r={R} fill="none" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - (view?.progress ?? 0))} style={{ transition: "stroke-dashoffset 1s linear", filter: "drop-shadow(0 0 5px rgba(227,201,135,.7))" }} />
            </svg>
            <svg viewBox="0 0 48 48" className="absolute inset-0 m-auto h-11 w-11 text-gold-bright" aria-hidden><path d="M24 6c-1.5 3-5 5-5 9a5 5 0 0 0 10 0c0-4-3.5-6-5-9z" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M10 42V30a14 14 0 0 1 28 0v12M6 42h36M20 42v-6a4 4 0 0 1 8 0v6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </div>
          <div className="min-w-0 flex-1">
            {error ? (
              <p className="text-sm text-[var(--muted-on-night)]">تعذّر جلب المواقيت الآن. اضغط لعرض الصفحة.</p>
            ) : !loc && !busy ? (
              <div>
                <p className="text-sm text-[var(--muted-on-night)]">{locError ?? "لم نحدد موقعك بعد"}</p>
                <span role="button" tabIndex={0} onClick={(e) => { e.preventDefault(); refresh(); }} className="pressable mt-3 inline-flex h-10 items-center rounded-full bg-gradient-to-l from-gold-bright to-gold px-5 text-sm font-semibold text-[#1a1407]">تحديد موقعي</span>
              </div>
            ) : view ? (
              <>
                <p className="text-xs text-[var(--muted-on-night)]">الصلاة القادمة</p>
                <p className="font-display text-5xl leading-tight text-gold-bright">{view.label}</p>
                <p className="text-xl tabular-nums text-[var(--ivory)]">{view.time}</p>
                <p className="mt-0.5 text-sm text-[var(--muted-on-night)]">بعد <span className="tabular-nums text-[var(--ivory)]" dir="ltr">{view.countdown}</span></p>
              </>
            ) : (
              <p className="animate-pulse text-sm text-[var(--muted-on-night)]">{busy ? "جارٍ تحديد موقعك…" : "جارٍ حساب المواقيت…"}</p>
            )}
          </div>
        </div>
        {placeLabel && <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--muted-on-night)]"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>{placeLabel}</p>}
        {timings && (
          <ol className="mt-4 flex items-start justify-between gap-1 border-t border-white/10 pt-3" aria-label="مواقيت اليوم">
            {PRAYERS.map((p, i) => {
              const on = view?.idx === i;
              return (
                <li key={p.key} className={`flex-1 rounded-xl py-1.5 text-center text-[11px] ${on ? "bg-gold/15 text-gold-bright" : "text-[var(--muted-on-night)]"}`}>
                  <span className="block">{p.label}</span>
                  <span className="mt-0.5 block tabular-nums">{formatTime12h(timings[p.key] as string).replace(/\s?(AM|PM|ص|م)/i, "")}</span>
                </li>
              );
            })}
          </ol>
        )}
      </Link>
    </section>
  );
}
