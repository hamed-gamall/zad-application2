"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CopyShareBar from "@/components/CopyShareBar";
import type { DailyContent } from "@/lib/dailyContent";

// Small inline glyphs shown next to each "content of the day" card so each
// section is recognizable at a glance (Quran / Hadith / Dua).
function QuranGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5c2.4-1 5-1 8 .3v13c-3-1.3-5.6-1.3-8-.3z" />
      <path d="M20 5.5c-2.4-1-5-1-8 .3v13c3-1.3 5.6-1.3 8-.3z" />
    </svg>
  );
}
function HadithGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h9l3 3v13H6z" />
      <path d="M9 9h6M9 13h6M9 17h4" />
    </svg>
  );
}
function DuaGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 12c0-4 2-7 5-9 3 2 5 5 5 9a5 5 0 0 1-10 0Z" />
      <path d="M12 3v3" />
    </svg>
  );
}

// Slot computed from the *visitor's own local clock* (not a fixed UTC
// cutoff), so the 4-times-a-day rotation lines up with each person's own
// day/night, wherever they are — a phone or browser's local time already
// reflects the timezone of wherever the person actually is.
function localContentSlot(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const daysSinceYearStart = Math.floor(diff / 86400000);
  const quarterOfDay = Math.floor(now.getHours() / 6);
  return daysSinceYearStart * 4 + quarterOfDay;
}

export default function DailyContentSection({ initial }: { initial: DailyContent }) {
  const [content, setContent] = useState<DailyContent>(initial);

  useEffect(() => {
    let cancelled = false;
    let lastCheckedSlot = content.slot;

    async function refreshIfNeeded() {
      const slot = localContentSlot();
      if (slot === lastCheckedSlot) return;
      lastCheckedSlot = slot;
      try {
        const res = await fetch(`/api/daily-content?slot=${slot}`);
        if (!res.ok) return;
        const data: DailyContent = await res.json();
        if (!cancelled) setContent(data);
      } catch {
        // Silently keep showing the previous content on network errors.
      }
    }

    // Correct immediately on mount (the server-rendered version used UTC,
    // the visitor's local time may already be in a different slot), then
    // keep checking every second so the switch happens right on time
    // without needing a manual page refresh.
    refreshIfNeeded();
    const id = setInterval(refreshIfNeeded, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { ayah, hadith, dua } = content;

  return (
    <section className="pb-6 pt-10">
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="font-display text-2xl text-[var(--ivory)]">محتوى اليوم</h2>
        <div className="mt-6 space-y-9">
          {/* Ayah of the day */}
          <article className="border-s border-gold/35 ps-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gold-bright">
              <QuranGlyph /> آية اليوم
            </p>
            <p className="font-quran mt-3 text-2xl leading-[2.2]">
              {ayah.text}
              <span className="ayah-mark">{ayah.ayahNumber}</span>
            </p>
            <p className="mt-3 text-sm text-[var(--muted-on-night)]">
              سورة {ayah.surahTitleAr} — الآية {ayah.ayahNumber}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <Link
                href={`/quran/${ayah.surahNumber}?ayah=${ayah.ayahNumber}`}
                className="focus-ring text-sm font-semibold text-gold-bright hover:underline"
              >
                عرض الآية ←
              </Link>
              <CopyShareBar text={`${ayah.text} — سورة ${ayah.surahTitleAr}: ${ayah.ayahNumber}`} />
            </div>
          </article>

          {/* Hadith of the day */}
          <article className="border-s border-gold/35 ps-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gold-bright">
              <HadithGlyph /> حديث اليوم
            </p>
            <p className="mt-3 line-clamp-6 text-lg leading-loose">{hadith.text}</p>
            <p className="mt-3 text-sm text-[var(--muted-on-night)]">
              {hadith.bookNameArabic} — الحديث رقم {hadith.number}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <Link
                href={`/hadith/${hadith.bookSlug}/${hadith.number}`}
                className="focus-ring text-sm font-semibold text-gold-bright hover:underline"
              >
                عرض الحديث ←
              </Link>
              <CopyShareBar text={hadith.text} />
            </div>
          </article>

          {/* Dua of the day */}
          <article className="border-s border-gold/35 ps-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gold-bright">
              <DuaGlyph /> دعاء اليوم
            </p>
            <p className="font-quran mt-3 text-xl leading-loose">{dua.text}</p>
            <p className="mt-3 text-sm text-[var(--muted-on-night)]">{dua.category}</p>
            <div className="mt-4 flex items-center justify-between">
              <Link href="/azkar?tab=dua" className="focus-ring text-sm font-semibold text-gold-bright hover:underline">
                المزيد من الأدعية ←
              </Link>
              <CopyShareBar text={dua.text} />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
