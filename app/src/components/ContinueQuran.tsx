"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPageProgress, getProgress } from "@/lib/storage";
import { mushafPageImageUrl, TOTAL_MUSHAF_PAGES } from "@/lib/live";

type Pos = { href: string; title: string; detail: string; pct: number; page: number };

// "Continue Quran": only appears as a resume card when the person has really
// read something. The thumbnail is the actual Mushaf page they stopped on.
export default function ContinueQuran({ surahNames, surahPages }: { surahNames: Record<number, string>; surahPages: Record<number, number> }) {
  const [pos, setPos] = useState<Pos | null>(null);
  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    const page = getPageProgress();
    const text = getProgress();
    const usePage = page && (!text || page.updatedAt >= text.updatedAt);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (usePage && page) setPos({ href: "/quran", title: `صفحة ${page.page.toLocaleString("ar-EG")}`, detail: `من ${TOTAL_MUSHAF_PAGES.toLocaleString("ar-EG")} صفحة`, pct: page.page / TOTAL_MUSHAF_PAGES, page: page.page });
    else if (text) setPos({ href: `/quran/${text.surah}?ayah=${text.ayah}`, title: `سورة ${surahNames[text.surah] ?? text.surah}`, detail: `الآية ${text.ayah.toLocaleString("ar-EG")}`, pct: text.surah / 114, page: surahPages[text.surah] ?? 1 });
  }, [surahNames, surahPages]);

  if (!pos) {
    return (
      <Link href="/quran/1" className="pressable focus-ring group relative flex items-center gap-5 overflow-hidden rounded-[28px] glass p-4 pe-6">
        <div className="relative flex h-[132px] w-[96px] shrink-0 items-center justify-center rounded-md" style={{ background: "linear-gradient(160deg,#1f6f5c,#0b2a22)", boxShadow: "inset 0 0 0 1px rgba(227,201,135,.5), 0 18px 40px -14px rgba(0,0,0,.7)" }} aria-hidden>
          <svg viewBox="0 0 60 80" className="h-20 w-14 text-gold-bright"><rect x="6" y="6" width="48" height="68" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" /><path d="M30 24l5 5h7v7l5 5-5 5v7h-7l-5 5-5-5h-7v-7l-5-5 5-5v-7h7z" fill="none" stroke="currentColor" strokeWidth="1" /><path d="M30 33l8 8-8 8-8-8z" fill="currentColor" fillOpacity=".25" /></svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[var(--muted-on-night)]">القرآن الكريم</p>
          <p className="font-display mt-1 text-3xl font-bold text-[var(--ivory)]">ابدأ رحلتك مع القرآن</p>
          <p className="mt-0.5 text-sm text-[var(--muted-on-night)]">سيظهر هنا موضع توقفك تلقائيًا</p>
        </div>
      </Link>
    );
  }

  return (
    <Link href={pos.href} className="pressable focus-ring group relative flex items-center gap-5 overflow-hidden rounded-[28px] glass p-4 pe-6">
      <div className="mushaf-thumb relative h-[132px] w-[96px] shrink-0 -rotate-3 overflow-hidden rounded-md transition-transform duration-500 group-hover:rotate-0">
        {imgOk && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mushafPageImageUrl(pos.page)} alt="" className="h-full w-full object-cover object-top" style={{ mixBlendMode: "multiply" }} onError={() => setImgOk(false)} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[var(--muted-on-night)]">أكمل القراءة</p>
        <p className="font-display mt-1 truncate text-3xl font-bold text-[var(--ivory)]">{pos.title}</p>
        <p className="mt-0.5 text-sm text-[var(--muted-on-night)]">{pos.detail}</p>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(pos.pct * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-gradient-to-l from-gold-bright to-gold" style={{ width: `${Math.max(3, pos.pct * 100)}%` }} />
        </div>
      </div>
    </Link>
  );
}
