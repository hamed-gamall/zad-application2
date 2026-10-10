"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import CopyShareBar from "@/components/CopyShareBar";
import ScreenHeader from "@/components/ui/ScreenHeader";

interface QuranHit {
  surah: number;
  surahName: string;
  ayah: number;
  text: string;
}
interface HadithHit {
  book: string;
  bookName: string;
  number: number;
  text: string;
}
interface AzkarHit {
  categoryId: number;
  category: string;
  itemId: number;
  text: string;
}
interface DuaHit {
  category: string;
  index: number;
  text: string;
}
interface ToolHit {
  title: string;
  href: string;
}
interface ReciterHit {
  id: number;
  name: string;
}

interface Results {
  quran: QuranHit[];
  hadith: HadithHit[];
  azkar: AzkarHit[];
  dua: DuaHit[];
  tools: ToolHit[];
  reciters: ReciterHit[];
}

const SCOPES = [
  { id: "all", label: "الكل" },
  { id: "quran", label: "القرآن" },
  { id: "hadith", label: "الحديث" },
  { id: "azkar", label: "الأذكار" },
  { id: "dua", label: "الأدعية" },
  { id: "reciters", label: "القرّاء" },
  { id: "tools", label: "الأدوات" },
] as const;

function SectionTitle({ children, n }: { children: React.ReactNode; n: number }) {
  return (
    <h2 className="font-display mb-1 flex items-baseline gap-2 text-2xl text-[var(--ivory)]">{children}<span className="text-xs tabular-nums text-gold-bright">{n.toLocaleString("ar-EG")}</span></h2>
  );
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<(typeof SCOPES)[number]["id"]>("all");
  const [results, setResults] = useState<Results | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (q.trim().length < 2) {
      // Clearing results when the query is cleared is a direct consequence
      // of the query prop changing, not an external-system subscription.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(null);
      return;
    }
    const handle = setTimeout(() => {
      startTransition(async () => {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&scope=${scope}`
        );
        setResults(await res.json());
      });
    }, 350);
    return () => clearTimeout(handle);
  }, [q, scope]);

  const totalHits = results
    ? results.quran.length + results.hadith.length + results.azkar.length + results.dua.length + results.tools.length + results.reciters.length
    : 0;

  const row = "border-b border-white/[0.06] py-5 last:border-0";
  const ref = "mt-2 flex items-center justify-between gap-3 text-sm";
  const lnk = "focus-ring text-gold-bright hover:underline";

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="البحث" subtitle="القرآن والحديث والأذكار والأدعية في مكان واحد" />
      <div className="px-6">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="اكتب كلمة أو عبارة" className="field text-base" aria-label="بحث" />
        <div className="h-scroll -mx-6 mt-3" role="group" aria-label="نطاق البحث">
          {SCOPES.map((s) => <button key={s.id} aria-pressed={scope === s.id} onClick={() => setScope(s.id)} className="chip focus-ring">{s.label}</button>)}
        </div>
      </div>

      {isPending && <p className="mt-10 animate-pulse text-center text-sm text-[var(--muted-on-night)]">جارٍ البحث…</p>}
      {!results && !isPending && (
        <div className="px-6 py-20 text-center">
          <svg aria-hidden viewBox="0 0 80 80" className="mx-auto mb-4 h-20 w-20 text-gold/40"><circle cx="34" cy="34" r="20" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="m50 50 18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M34 22l5 5h7v7l-5 5v7h-7l-5 5" fill="none" stroke="currentColor" strokeWidth=".8" /></svg>
          <p className="text-sm text-[var(--muted-on-night)]">ابدأ بكتابة حرفين على الأقل</p>
        </div>
      )}

      {results && !isPending && (
        <div className="space-y-9 px-6 pt-8">
          {results.quran.length > 0 && (
            <section><SectionTitle n={results.quran.length}>القرآن الكريم</SectionTitle>
              <ul>{results.quran.map((r, i) => (
                <li key={i} className={row}>
                  <p className="font-quran text-2xl leading-[2.1] text-[var(--ivory)]" dir="rtl">{r.text}</p>
                  <div className={ref}><Link href={`/quran/${r.surah}?ayah=${r.ayah}`} className={lnk}>سورة {r.surahName} — الآية {r.ayah.toLocaleString("ar-EG")}</Link><CopyShareBar text={`${r.text} — سورة ${r.surahName}: ${r.ayah}`} /></div>
                </li>))}</ul></section>
          )}
          {results.hadith.length > 0 && (
            <section><SectionTitle n={results.hadith.length}>الحديث الشريف</SectionTitle>
              <ul>{results.hadith.map((r, i) => (
                <li key={i} className={row}>
                  <p className="text-[17px] leading-9 text-[var(--ivory)]">{r.text}</p>
                  <div className={ref}><Link href={`/hadith/${r.book}/${r.number}`} className={lnk}>{r.bookName} — رقم {r.number.toLocaleString("ar-EG")}</Link><CopyShareBar text={r.text} /></div>
                </li>))}</ul></section>
          )}
          {results.azkar.length > 0 && (
            <section><SectionTitle n={results.azkar.length}>الأذكار</SectionTitle>
              <ul>{results.azkar.map((r, i) => (
                <li key={i} className={row}>
                  <p className="font-quran text-xl leading-[2.1] text-[var(--ivory)]" dir="rtl">{r.text}</p>
                  <div className={ref}><Link href={`/azkar/${r.categoryId}`} className={lnk}>{r.category}</Link><CopyShareBar text={r.text} /></div>
                </li>))}</ul></section>
          )}
          {results.dua.length > 0 && (
            <section><SectionTitle n={results.dua.length}>الأدعية</SectionTitle>
              <ul>{results.dua.map((r, i) => (
                <li key={i} className={row}>
                  <p className="font-quran text-xl leading-[2.1] text-[var(--ivory)]" dir="rtl">{r.text}</p>
                  <div className={ref}><Link href={`/dua/${encodeURIComponent(r.category)}`} className={lnk}>{r.category}</Link><CopyShareBar text={r.text} /></div>
                </li>))}</ul></section>
          )}
          {results.reciters.length > 0 && (
            <section><SectionTitle n={results.reciters.length}>القرّاء</SectionTitle>
              <ul className="mt-3 flex flex-wrap gap-2">{results.reciters.map((r) => <li key={r.id}><Link href={`/reciters/${r.id}`} className="chip focus-ring !h-11">{r.name}</Link></li>)}</ul></section>
          )}
          {results.tools.length > 0 && (
            <section><SectionTitle n={results.tools.length}>الأدوات</SectionTitle>
              <ul className="mt-3 flex flex-wrap gap-2">{results.tools.map((r, i) => <li key={i}><Link href={r.href} className="chip focus-ring !h-11">{r.title}</Link></li>)}</ul></section>
          )}
          {totalHits === 0 && <p className="py-12 text-center text-sm text-[var(--muted-on-night)]">لا توجد نتائج مطابقة لـ «{q}».</p>}
        </div>
      )}
    </div>
  );
}
