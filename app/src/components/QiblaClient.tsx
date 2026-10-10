"use client";

import { useEffect, useState } from "react";
import { fetchQibla } from "@/lib/live";
import { useUserLocation } from "@/components/useUserLocation";
import ImmersiveScreen from "@/components/ui/ImmersiveScreen";
import SceneArt from "@/components/ui/SceneArt";

const KAABA = { lat: 21.4225, lon: 39.8262 };
function distanceKm(lat: number, lon: number) {
  const r = Math.PI / 180;
  const a = Math.sin(((KAABA.lat - lat) * r) / 2) ** 2 + Math.cos(lat * r) * Math.cos(KAABA.lat * r) * Math.sin(((KAABA.lon - lon) * r) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const ar = (n: number) => n.toLocaleString("ar-EG");

// Qibla as an instrument: the dial turns with the phone, the gold Kaaba
// marker sits at the true bearing, and the whole ring glows when aligned.
export default function QiblaClient() {
  const [angle, setAngle] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [km, setKm] = useState<number | null>(null);
  const [compassError, setCompassError] = useState<string | null>(null);
  const [compassOn, setCompassOn] = useState(false);
  const { loc, busy, error: locError, refresh } = useUserLocation();

  useEffect(() => {
    if (!loc) return;
    let cancelled = false;
    fetchQibla(loc.lat, loc.lon)
      .then((res) => {
        if (cancelled) return;
        setAngle(res.data.direction);
        setKm(distanceKm(loc.lat, loc.lon));
      })
      .catch(() => !cancelled && setCompassError("تعذّر حساب اتجاه القبلة. تحقق من الإنترنت."));
    return () => {
      cancelled = true;
    };
  }, [loc]);
  const error = compassError ?? (!loc ? locError : null);

  async function enableCompass() {
    const w = window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } };
    try {
      if (w.DeviceOrientationEvent?.requestPermission) {
        const perm = await w.DeviceOrientationEvent.requestPermission();
        if (perm !== "granted") return;
      }
      // Prefer the absolute (north-anchored) event; non-absolute readings
      // drift from an arbitrary start, so they are ignored below.
      const abs = "ondeviceorientationabsolute" in (window as unknown as Record<string, unknown>);
      window.addEventListener(abs ? "deviceorientationabsolute" : "deviceorientation", handleOrientation as EventListener, true);
      setCompassOn(true);
    } catch {
      setCompassError("جهازك لا يدعم البوصلة. يمكنك الاعتماد على الزاوية الظاهرة.");
    }
  }
  function handleOrientation(e: DeviceOrientationEvent & { webkitCompassHeading?: number; absolute?: boolean }) {
    if (e.webkitCompassHeading != null) return setHeading(e.webkitCompassHeading);
    if (e.absolute && e.alpha != null) setHeading(360 - e.alpha);
  }

  const dial = heading != null ? -heading : 0; // dial rotates so N stays north
  const diff = angle != null ? (((angle - (heading ?? 0)) % 360) + 540) % 360 - 180 : 180;
  const aligned = compassOn && heading != null && Math.abs(diff) < 4;
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);

  return (
    <ImmersiveScreen dark backHref="/tools" title="القبلة" subtitle={km != null ? `${ar(Math.round(km))} كم إلى الكعبة · ${loc?.label ?? ""}` : busy ? "جارٍ تحديد الموقع" : "الموقع غير محدد"} alwaysShow
      background={<><SceneArt variant="dusk" className="absolute inset-x-0 bottom-0 h-[45%] !mask-none opacity-80" /><div aria-hidden className="pointer-events-none absolute inset-0 transition-opacity duration-700" style={{ opacity: aligned ? 1 : 0.35, background: "radial-gradient(60% 40% at 50% 46%, rgba(227,201,135,.28), transparent 70%)" }} /></>}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-6 pb-16 pt-20">
        <div className="relative aspect-square w-full max-w-[340px]">
          {/* fixed lubber line: where the phone points */}
          <span aria-hidden className="absolute -top-2 left-1/2 z-10 h-5 w-[3px] -translate-x-1/2 rounded bg-gold-bright" />
          <svg viewBox="-150 -150 300 300" className="h-full w-full" role="img" aria-label={angle != null ? `اتجاه القبلة ${angle.toFixed(0)} درجة` : "البوصلة"}>
            <g style={{ transform: `rotate(${dial}deg)`, transition: "transform .25s linear" }}>
              <circle r="140" strokeWidth="2" style={{ fill: "var(--surface-strong)", stroke: aligned ? "var(--gold)" : "var(--glass-line)", transition: "stroke .5s" }} />
              {ticks.map((t) => (
                <line key={t} x1="0" x2="0" y1="-139" y2={t % 90 === 0 ? -122 : t % 30 === 0 ? -128 : -134} style={{ stroke: t === 0 ? "var(--gold)" : "var(--muted-on-night)" }} strokeWidth={t % 90 === 0 ? 2 : 1} transform={`rotate(${t})`} />
              ))}
              {([["ش", 0], ["ق", 90], ["ج", 180], ["غ", 270]] as [string, number][]).map(([l, a]) => (
                <g key={l} transform={`rotate(${a})`}>
                  <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fontSize="16" transform={`translate(0 -104) rotate(${-(a + dial)})`} style={{ fontFamily: "var(--font-amiri)", fill: a === 0 ? "var(--gold)" : "var(--muted-on-night)" }}>{l}</text>
                </g>
              ))}
              <circle r="78" fill="none" stroke="rgba(227,201,135,.14)" strokeDasharray="2 6" />
              {angle != null && (
                <g transform={`rotate(${angle})`}>
                  <path d="M0 -70 L0 -20" stroke="url(#qg)" strokeWidth="3" strokeLinecap="round" />
                  <g transform="translate(0 -92)">
                    <circle r="22" strokeWidth="1.5" style={{ fill: "var(--surface-strong)", stroke: "var(--gold)" }} />
                    <rect x="-10" y="-10" width="20" height="20" rx="2" fill="#0a0f0d" strokeWidth="1" style={{ stroke: "var(--gold)" }} />
                    <rect x="-10" y="-5" width="20" height="3" fill="#c8a45a" />
                  </g>
                </g>
              )}
              <defs><linearGradient id="qg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e3c987" /><stop offset="1" stopColor="#e3c987" stopOpacity="0" /></linearGradient></defs>
            </g>
            <circle r="5" style={{ fill: "var(--gold)" }} />
          </svg>
        </div>

        <div className="text-center">
          {angle != null ? (
            <>
              <p className="font-display text-7xl leading-none tabular-nums text-gold-bright">{ar(Math.round(angle))}°</p>
              <p className="mt-2 text-sm text-[var(--muted-on-night)]">{aligned ? "أنت متجه نحو القبلة" : "من الشمال باتجاه عقارب الساعة"}</p>
            </>
          ) : error ? (
            <p className="max-w-xs text-sm text-gold-bright" role="alert">{error}</p>
          ) : (
            <p className="animate-pulse text-sm text-[var(--muted-on-night)]">جارٍ تحديد موقعك…</p>
          )}
        </div>

        {!loc && !busy && <button onClick={refresh} className="pressable focus-ring h-12 rounded-full bg-gradient-to-l from-gold-bright to-gold px-8 font-semibold text-[#1a1407]">تحديد موقعي</button>}
        {!compassOn && angle != null && (
          <button onClick={enableCompass} className="pressable focus-ring h-12 rounded-full bg-gradient-to-l from-gold-bright to-gold px-8 font-semibold text-[#1a1407]">تفعيل البوصلة</button>
        )}
        {error && angle != null && <p className="text-xs text-[var(--muted-on-night)]">{error}</p>}
      </div>
    </ImmersiveScreen>
  );
}
