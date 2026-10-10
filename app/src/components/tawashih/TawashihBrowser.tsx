"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TawashihReciter } from "@/lib/data";
import ArtMedallion from "@/components/ui/ArtMedallion";

const ar = (n: number) => n.toLocaleString("ar-EG");

export default function TawashihBrowser({ reciters }: { reciters: TawashihReciter[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim();
    const list = q ? reciters.filter((r) => r.name.includes(q)) : reciters;
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [reciters, query]);
  const top = useMemo(() => [...reciters].sort((a, b) => b.count - a.count).slice(0, 8), [reciters]);

  return (
    <div>
      <div className="px-6"><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث باسم المنشد" className="field" aria-label="بحث عن منشد" /></div>
      {!query.trim() && (
        <section className="mt-8" aria-label="الأكثر تسجيلات">
          <h2 className="font-display mb-3 px-6 text-2xl text-[var(--ivory)]">الأكثر إنشادًا</h2>
          <div className="h-scroll pb-2">
            {top.map((r) => (
              <Link key={r.id} href={`/tools/tawashih/${r.id}`} className="pressable focus-ring block w-36 text-center">
                <ArtMedallion seed={"t" + r.id} glyph="♪" className="w-36 text-5xl shadow-[0_18px_40px_-14px_rgba(0,0,0,.7)]" rounded="rounded-[32px]" />
                <span className="font-display mt-2 line-clamp-2 block text-lg leading-snug text-[var(--ivory)]">{r.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <p className="mb-2 mt-8 px-6 text-xs text-[var(--muted-on-night)]">{ar(filtered.length)} منشد</p>
      <ul className="px-6">
        {filtered.map((r) => (
          <li key={r.id}>
            <Link href={`/tools/tawashih/${r.id}`} className="pressable focus-ring flex items-center gap-4 rounded-2xl px-1 py-2 hover:bg-white/[0.04]">
              <ArtMedallion seed={"t" + r.id} glyph="♪" className="w-12 text-xl" rounded="rounded-2xl" />
              <span className="min-w-0 flex-1"><span className="block truncate text-[15px] text-[var(--ivory)]">{r.name}</span><span className="block text-xs text-[var(--muted-on-night)]">{ar(r.count)} {r.count === 1 ? "تسجيل" : "تسجيلًا"}</span></span>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && <li className="py-14 text-center text-sm text-[var(--muted-on-night)]">لا توجد نتائج مطابقة.</li>}
      </ul>
    </div>
  );
}
