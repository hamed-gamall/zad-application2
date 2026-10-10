"use client";

import { useEffect, useState } from "react";
import SceneArt from "@/components/ui/SceneArt";

// Opening moment: a mosque skyline at night, the emblem glowing above it, then
// a dissolve into the app. Once per session; skipped for reduced motion.
export default function Splash() {
  const [show, setShow] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("zad:splash");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(false);
      return;
    }
    sessionStorage.setItem("zad:splash", "1");
    const a = setTimeout(() => setDone(true), 1700);
    const b = setTimeout(() => setShow(false), 2500);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  if (!show) return null;
  return (
    <div className="splash force-dark" data-done={done} aria-hidden>
      <SceneArt variant="night" className="absolute inset-x-0 bottom-0 h-[62%] !mask-none" />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center pb-24">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-512.png" alt="" className="splash-logo" />
        <p className="font-display mt-7 text-3xl text-gold-bright">زَادُ المُسْلِم</p>
        <p className="mt-2 text-sm tracking-[0.3em] text-[var(--muted-on-night)]">ZAD AL MUSLIM</p>
        <p className="mt-5 text-sm text-[var(--muted-on-night)]">رفيقك في رحلتك الإيمانية</p>
      </div>
    </div>
  );
}
