"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ReciterInfo } from "@/lib/live";
import ArtMedallion from "@/components/ui/ArtMedallion";

const ar = (n: number) => n.toLocaleString("ar-EG");

// Reciters as people to follow: a carousel of emblem portraits first, then
// an alphabetical index. Riwaya filter is a quiet chip row.
export default function RecitersBrowser({ reciters }: { reciters: ReciterInfo[] }) {
  const [query, setQuery] = useState("");
  const [riwaya, setRiwaya] = useState("");

  const riwayat = useMemo(() => {
    const count = new Map<string, number>();
    reciters.forEach((r) => r.moshaf.forEach((m) => count.set(m.name, (count.get(m.name) ?? 0) + 1)));
    return Array.from(count.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([n]) => n);
  }, [reciters]);

  const filtered = useMemo(() => {
    let list = reciters;
    if (riwaya) list = list.filter((r) => r.moshaf.some((m) => m.name === riwaya));
    const q = query.trim();
    if (q) list = list.filter((r) => r.name.includes(q));
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [reciters, query, riwaya]);

  const featured = useMemo(() => [...reciters].sort((a, b) => b.moshaf.length - a.moshaf.length).slice(0, 10), [reciters]);
  const browsing = !query.trim() && !riwaya;

  const grouped = useMemo(() => {
    const map = new Map<string, ReciterInfo[]>();
    filtered.forEach((r) => {
      const letter = r.name.trim()[0] || "#";
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(r);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "ar"));
  }, [filtered]);

  return (
    <div>
      <div className="px-6">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث باسم القارئ" className="field" aria-label="بحث عن قارئ" />
      </div>
      <div className="h-scroll mt-3" role="group" aria-label="الرواية">
        <button aria-pressed={!riwaya} onClick={() => setRiwaya("")} className="chip focus-ring">كل الروايات</button>
        {riwayat.map((r) => <button key={r} aria-pressed={riwaya === r} onClick={() => setRiwaya(r)} className="chip focus-ring">{r}</button>)}
      </div>

      {browsing && (
        <section className="mt-8" aria-label="قرّاء مميّزون">
          <h2 className="font-display mb-3 px-6 text-2xl text-[var(--ivory)]">قرّاء مميّزون</h2>
          <div className="h-scroll pb-2">
            {featured.map((r) => (
              <Link key={r.id} href={`/reciters/${r.id}`} className="pressable focus-ring block w-36 text-center">
                <ArtMedallion seed={String(r.id)} glyph={r.name.trim().charAt(0)} className="w-36 text-5xl shadow-[0_18px_40px_-14px_rgba(0,0,0,.7)]" rounded="rounded-[32px]" />
                <span className="font-display mt-2 line-clamp-2 block text-lg leading-snug text-[var(--ivory)]">{r.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mb-2 mt-8 px-6 text-xs text-[var(--muted-on-night)]">{ar(filtered.length)} قارئ</p>
      <div className="px-6">
        {grouped.map(([letter, list]) => (
          <section key={letter} className="mb-4">
            <h3 className="font-display sticky top-0 z-10 -mx-2 mb-1 px-2 py-1.5 text-xl text-gold-bright backdrop-blur-md" style={{ background: "rgba(7,30,25,.7)" }}>{letter}</h3>
            <ul>
              {list.map((r) => (
                <li key={r.id}>
                  <Link href={`/reciters/${r.id}`} className="pressable focus-ring flex items-center gap-4 rounded-2xl px-1 py-2 hover:bg-white/[0.04]">
                    <ArtMedallion seed={String(r.id)} glyph={r.name.trim().charAt(0)} className="w-12 text-xl" rounded="rounded-2xl" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] text-[var(--ivory)]">{r.name}</span>
                      <span className="block text-xs text-[var(--muted-on-night)]">{ar(r.moshaf.length)} {r.moshaf.length === 1 ? "رواية" : "روايات"}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {filtered.length === 0 && <p className="py-14 text-center text-sm text-[var(--muted-on-night)]">لا توجد نتائج. جرّب اسمًا آخر.</p>}
      </div>
    </div>
  );
}
