"use client";

import { useEffect, useState } from "react";
import { formatTime12h, type PrayerTimings } from "@/lib/live";
import { findCalculationMethod, type CalculationMethodId } from "@/lib/prayerMethods";
import { getNotificationSettings } from "@/lib/notifications/settings";
import { useUserLocation } from "@/components/useUserLocation";
import SceneArt from "@/components/ui/SceneArt";
import BottomSheet from "@/components/ui/BottomSheet";
import PrayerNotificationsSettings from "@/components/notifications/PrayerNotificationsSettings";

const LABELS: { key: keyof PrayerTimings; label: string }[] = [
  { key: "Fajr", label: "الفجر" },
  { key: "Sunrise", label: "الشروق" },
  { key: "Dhuhr", label: "الظهر" },
  { key: "Asr", label: "العصر" },
  { key: "Maghrib", label: "المغرب" },
  { key: "Isha", label: "العشاء" },
];

export default function PrayerTimesClient() {
  const [timings, setTimings] = useState<PrayerTimings | null>(null);
  const [hijri, setHijri] = useState<string | null>(null);
  const [gregorian, setGregorian] = useState<string | null>(null);
  // The calculation method lives in one place (the settings sheet below,
  // stored via getNotificationSettings) and is mirrored here instantly.
  const [methodId, setMethodId] = useState<CalculationMethodId>("egyptian");
  const [city, setCity] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { loc, busy, error: locError, refresh, setManual } = useUserLocation();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMethodId(getNotificationSettings().calculationMethod);
    const onMethodChanged = (e: Event) => {
      const d = (e as CustomEvent<{ calculationMethod: CalculationMethodId }>).detail;
      if (d) setMethodId(d.calculationMethod);
    };
    window.addEventListener("zad:calc-method-changed", onMethodChanged);
    return () => window.removeEventListener("zad:calc-method-changed", onMethodChanged);
  }, []);

  useEffect(() => {
    if (!loc) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setFetchError(null);
    const ts = Math.floor(Date.now() / 1000);
    fetch(`https://api.aladhan.com/v1/timings/${ts}?latitude=${loc.lat}&longitude=${loc.lon}&method=${findCalculationMethod(methodId).aladhanId}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setTimings(json.data.timings);
        const h = json.data.date.hijri;
        setHijri(`${h.weekday.ar} ${h.day} ${h.month.ar} ${h.year} هـ`);
        setGregorian(json.data.date.gregorian.date);
      })
      .catch(() => !cancelled && setFetchError("تعذّر جلب المواقيت، تحقق من الاتصال بالإنترنت."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [loc, methodId]);

  const error = fetchError ?? (!loc ? locError : null);
  const status = loc ? loc.label + (loc.source === "ip" ? " · تقريبي" : loc.source === "manual" ? " · مختار يدويًا" : "") : busy ? "جارٍ تحديد موقعك…" : "حدّد موقعك";
  const locateUser = refresh;

  const [, setTick] = useState(0);
  const [sheet, setSheet] = useState<null | "place" | "settings">(null);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const order = LABELS.filter((l) => l.key !== "Sunrise" || true);
  const nowD = new Date();
  const nowSec = nowD.getHours() * 3600 + nowD.getMinutes() * 60 + nowD.getSeconds();
  const sec = (k: keyof PrayerTimings) => {
    const [h, m] = (timings?.[k] as string).slice(0, 5).split(":").map(Number);
    return h * 3600 + m * 60;
  };
  let nextIdx = -1;
  let countdown = "";
  if (timings) {
    nextIdx = order.findIndex((l) => sec(l.key) > nowSec);
    const target = nextIdx === -1 ? sec(order[0].key) + 86400 : sec(order[nextIdx].key);
    if (nextIdx === -1) nextIdx = 0;
    const d = target - nowSec;
    const pad = (n: number) => String(n).padStart(2, "0");
    countdown = `${pad(Math.floor(d / 3600))}:${pad(Math.floor((d % 3600) / 60))}:${pad(d % 60)}`;
  }
  const nextLabel = timings ? order[nextIdx] : null;

  return (
    <div className="mx-auto max-w-2xl pb-6">
      <div className="force-dark relative isolate mb-4">
        <SceneArt variant="dusk" className="absolute inset-x-0 top-0 -z-10 h-[430px]" />
      <header className="flex items-center justify-between px-6 pt-6">
        <div>
          <h1 className="font-display text-3xl text-[var(--ivory)]">مواقيت الصلاة</h1>
          <p className="mt-1 text-xs text-[var(--muted-on-night)]">{hijri ?? "…"}{gregorian ? ` · ${gregorian}` : ""}</p>
        </div>
        <button onClick={() => setSheet("settings")} aria-label="إعدادات الصلاة والأذان" className="fcontrol focus-ring">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>
        </button>
      </header>

      <section className="relative isolate px-6 pb-10 pt-10 text-center" aria-live="polite">
        <div className="prayer-glow" aria-hidden />
        {loading && !timings ? (
          <p className="animate-pulse py-16 text-sm text-[var(--muted-on-night)]">جارٍ حساب المواقيت…</p>
        ) : error && !timings ? (
          <div className="py-12" role="alert">
            <p className="text-sm text-gold-bright">{error}</p>
            <button onClick={locateUser} className="pressable focus-ring mt-5 h-11 rounded-full bg-white/[0.08] px-6 text-sm">أعد المحاولة</button>
          </div>
        ) : nextLabel && timings ? (
          <>
            <p className="text-sm text-[var(--muted-on-night)]">الصلاة القادمة</p>
            <p className="font-display text-8xl leading-tight text-gold-bright">{nextLabel.label}</p>
            <p className="mt-1 text-2xl text-[var(--ivory)]">{formatTime12h(timings[nextLabel.key] as string)}</p>
            <p className="mt-6 font-mono text-4xl tabular-nums tracking-wider text-[var(--ivory)]" dir="ltr">{countdown}</p>
            <p className="mt-1 text-xs text-[var(--muted-on-night)]">متبقٍّ</p>
          </>
        ) : null}
        <button onClick={() => setSheet("place")} className="pressable focus-ring mx-auto mt-8 flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-xs text-[var(--muted-on-night)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
          {status}
        </button>
      </section>

      </div>

      {timings && (
        <ol className="relative mx-6 ps-8" aria-label="مواقيت اليوم">
          <span className="journey-line absolute bottom-4 top-4 start-[9px]" aria-hidden />
          {order.map((l, i) => {
            const past = sec(l.key) <= nowSec && i < nextIdx || (nextIdx === 0 && sec(l.key) <= nowSec);
            const isNext = i === nextIdx;
            return (
              <li key={l.key} className={`relative flex items-center justify-between rounded-2xl px-4 py-4 transition-colors ${isNext ? "bg-gold/12 ring-1 ring-gold/30" : ""}`} aria-current={isNext ? "time" : undefined}>
                <span aria-hidden className={`absolute -start-8 top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full border ${isNext ? "border-gold-bright bg-gold-bright shadow-[0_0_14px_rgba(227,201,135,.8)]" : past ? "border-gold/60 bg-gold/50" : "border-white/25 bg-ink-night"}`} />
                <span className={`font-display text-2xl ${isNext ? "text-gold-bright" : past ? "text-[var(--muted-on-night)]" : "text-[var(--ivory)]"}`}>{l.label}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-[var(--muted-on-night)]">{isNext ? "القادمة" : past ? "مضت" : ""}</span>
                  <span className={`text-lg tabular-nums ${isNext ? "text-[var(--ivory)]" : "text-[var(--muted-on-night)]"}`}>{formatTime12h(timings[l.key] as string)}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <BottomSheet open={sheet === "place"} onClose={() => setSheet(null)} title="الموقع">
        <button disabled={busy} onClick={async () => { await locateUser(); setSheet(null); }} className="pressable focus-ring flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-l from-gold-bright to-gold font-semibold text-[#1a1407] disabled:opacity-60">{busy ? "جارٍ تحديد موقعك…" : "استخدم موقعي الحالي (GPS)"}</button>
        <p className="my-4 text-center text-xs text-[var(--muted-on-night)]">أو اكتب اسم مدينة</p>
        <div className="flex gap-2">
          <input value={city} onChange={(e) => setCity(e.target.value)} onKeyDown={async (e) => { if (e.key === "Enter" && (await setManual(city))) { setCity(""); setSheet(null); } }} placeholder="مثل: القاهرة" className="field" aria-label="اسم المدينة" />
          <button disabled={busy} onClick={async () => { if (await setManual(city)) { setCity(""); setSheet(null); } }} className="pressable focus-ring h-[52px] shrink-0 rounded-full bg-white/[0.1] px-6 disabled:opacity-50">{busy ? "…" : "بحث"}</button>
        </div>
        {locError && <p className="mt-3 text-sm text-gold-bright" role="alert">{locError}</p>}
      </BottomSheet>
      <BottomSheet open={sheet === "settings"} onClose={() => setSheet(null)} title="الصلاة والأذان">
        <p className="mb-4 text-xs text-[var(--muted-on-night)]">طريقة الحساب والمذهب والمؤذّن والتنبيهات. أي تغيير ينعكس على المواقيت فورًا.</p>
        <PrayerNotificationsSettings />
      </BottomSheet>
    </div>
  );
}
