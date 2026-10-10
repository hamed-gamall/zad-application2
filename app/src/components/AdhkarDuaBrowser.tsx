"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AzkarCategory, DuaCategory } from "@/lib/types";
import ArtMedallion from "@/components/ui/ArtMedallion";

type Entry =
  | { kind: "azkar"; id: number; title: string; count: number; href: string }
  | { kind: "dua"; id: string; title: string; count: number; href: string };

export default function AdhkarDuaBrowser({
  azkar,
  dua,
  initialTab = "all",
}: {
  azkar: AzkarCategory[];
  dua: DuaCategory[];
  initialTab?: "all" | "azkar" | "dua";
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "azkar" | "dua">(initialTab);

  useEffect(() => {
    // Reacting to the `tab` query param changing (via the ?tab= link from
    // the home page), not subscribing to an external system.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilter(initialTab);
  }, [initialTab]);

  const entries: Entry[] = useMemo(
    () => [
      ...azkar.map(
        (c): Entry => ({
          kind: "azkar",
          id: c.id,
          title: c.category,
          count: c.items.length,
          href: `/azkar/${c.id}`,
        })
      ),
      ...dua.map(
        (c): Entry => ({
          kind: "dua",
          id: c.category,
          title: c.category,
          count: c.items.length,
          href: `/dua/${encodeURIComponent(c.category)}`,
        })
      ),
    ],
    [azkar, dua]
  );

  const filtered = useMemo(() => {
    let list = entries;
    if (filter !== "all") list = list.filter((e) => e.kind === filter);
    const q = query.trim();
    if (q) list = list.filter((e) => e.title.includes(q));
    return list;
  }, [entries, filter, query]);

  const browsing = !query.trim() && filter === "all";
  const featured: Entry[] = filtered.filter((e) => e.kind === "azkar").slice(0, 8);
  const rows = browsing ? filtered.filter((e) => !featured.includes(e)) : filtered;

  return (
    <div>
      <div className="px-6">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في الأذكار والأدعية" className="field" aria-label="بحث" />
        <div className="mt-3 flex gap-2" role="group" aria-label="التصنيف">
          {[{ id: "all", label: "الكل" }, { id: "azkar", label: "أذكار" }, { id: "dua", label: "أدعية" }].map((f) => (
            <button key={f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id as typeof filter)} className="chip focus-ring">{f.label}</button>
          ))}
        </div>
      </div>

      {browsing && featured.length > 0 && (
        <section className="mt-8" aria-label="أذكار مختارة">
          <h2 className="font-display mb-3 px-6 text-2xl text-[var(--ivory)]">ابدأ بذكر</h2>
          <div className="h-scroll pb-2">
            {featured.map((e) => (
              <Link key={e.href} href={e.href} className="pressable focus-ring relative block w-40 overflow-hidden rounded-[28px]">
                <ArtMedallion seed={e.title} glyph="۞" rounded="rounded-[28px]" className="w-40 text-4xl" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#061512] via-[#061512]/80 to-transparent px-3 pb-3 pt-10 text-center">
                  <span className="font-display line-clamp-2 block text-lg leading-snug text-[var(--ivory)]">{e.title}</span>
                  <span className="block text-[11px] text-gold-bright">{e.count.toLocaleString("ar-EG")} ذكر</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ul className="mt-6 px-6">
        {rows.map((e) => (
          <li key={`${e.kind}-${e.id}`}>
            <Link href={e.href} className="pressable focus-ring flex items-center gap-4 rounded-2xl px-1 py-2.5 hover:bg-white/[0.04]">
              <ArtMedallion seed={e.title} glyph={e.kind === "azkar" ? "۞" : "☾"} className="w-12 text-xl" rounded="rounded-2xl" />
              <span className="min-w-0 flex-1">
                <span className="font-display block truncate text-xl text-[var(--ivory)]">{e.title}</span>
                <span className="block text-xs text-[var(--muted-on-night)]">{e.kind === "azkar" ? "أذكار" : "دعاء"} · {e.count.toLocaleString("ar-EG")}</span>
              </span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="py-14 text-center text-sm text-[var(--muted-on-night)]">لا توجد نتائج. جرّب كلمة أخرى.</li>}
      </ul>
    </div>
  );
}
