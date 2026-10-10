"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SurahMeta } from "@/lib/types";
import { getProgress, getPageProgress, type ReadingProgress } from "@/lib/storage";

const ar = (n: number) => n.toLocaleString("ar-EG");

// The Quran library: one large search field, three quiet filters and a
// continuous list — numbers sit in verse-marker rosettes, not boxes.
export default function SurahBrowser({ surahs }: { surahs: SurahMeta[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "Mecca" | "Medina">("all");
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [pageProgress, setPageProgress] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(getProgress());
    setPageProgress(getPageProgress()?.page ?? null);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim();
    return surahs
      .map((s, i) => ({ ...s, number: i + 1 }))
      .filter((s) => (filter === "all" ? true : s.place === filter))
      .filter((s) => !q || s.titleAr.includes(q) || s.titleEn.toLowerCase().includes(q.toLowerCase()) || String(s.number) === q);
  }, [surahs, query, filter]);

  const last = progress ? surahs[progress.surah - 1] : null;

  return (
    <div className="px-6">
      {progress && last && (
        <Link href={`/quran/${progress.surah}?ayah=${progress.ayah}`} className="pressable focus-ring glass mb-6 flex items-center justify-between rounded-[28px] px-5 py-4">
          <span>
            <span className="block text-xs text-[var(--muted-on-night)]">أكمل من حيث توقفت</span>
            <span className="font-display block text-2xl text-[var(--ivory)]">سورة {last.titleAr}</span>
            <span className="block text-xs text-gold-bright">الآية {ar(progress.ayah)}{pageProgress ? ` · صفحة ${ar(pageProgress)}` : ""}</span>
          </span>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-gold-bright to-gold text-[#1a1407]" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </span>
        </Link>
      )}

      <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث باسم السورة أو رقمها" className="field text-base" aria-label="بحث في السور" />
      <div className="mt-3 flex gap-2" role="group" aria-label="مكان النزول">
        {([["all", "الكل"], ["Mecca", "مكية"], ["Medina", "مدنية"]] as const).map(([k, l]) => (
          <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)} className="chip focus-ring">{l}</button>
        ))}
      </div>

      <ul className="mt-5">
        {filtered.map((s) => (
          <li key={s.number}>
            <Link href={`/quran/${s.number}`} className="pressable focus-ring group flex items-center gap-4 rounded-2xl px-1 py-3 hover:bg-white/[0.04]">
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center" aria-hidden>
                <svg viewBox="0 0 44 44" className="absolute inset-0 text-gold/70"><path d="M22 2l5 5h7v7l5 5-5 5v7h-7l-5 5-5-5h-7v-7l-5-5 5-5V7h7z" fill="rgba(200,164,90,.08)" stroke="currentColor" strokeWidth="1" /></svg>
                <span className="relative text-[13px] tabular-nums text-gold-bright">{ar(s.number)}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-display block text-2xl leading-tight text-[var(--ivory)]">{s.titleAr}</span>
                <span className="block text-xs text-[var(--muted-on-night)]">{s.titleEn} · {s.place === "Mecca" ? "مكية" : "مدنية"}</span>
              </span>
              <span className="text-sm text-[var(--muted-on-night)]">{ar(s.count)} آية</span>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && <li className="py-14 text-center text-sm text-[var(--muted-on-night)]">لا توجد سورة بهذا الاسم. جرّب جزءًا من الاسم أو الرقم.</li>}
      </ul>
    </div>
  );
}
