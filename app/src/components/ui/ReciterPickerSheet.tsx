"use client";

import { useMemo, useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import ArtMedallion from "@/components/ui/ArtMedallion";
import type { ReciterInfo } from "@/lib/live";

// Reciter chooser shared by the Mushaf and text readers: searchable list
// with generated emblems; tells you if a reciter doesn't read this surah.
export default function ReciterPickerSheet({
  open,
  onClose,
  reciters,
  loading,
  notice,
  currentName,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  reciters: ReciterInfo[] | null;
  loading: boolean;
  notice: string | null;
  currentName?: string | null;
  onPick: (r: ReciterInfo) => void;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    if (!reciters) return [];
    const t = q.trim();
    return (t ? reciters.filter((r) => r.name.includes(t)) : reciters).filter((r) => r.moshaf.length > 0).slice(0, 200);
  }, [reciters, q]);
  return (
    <BottomSheet open={open} onClose={onClose} title="اختر القارئ">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم القارئ" className="field mb-3" aria-label="بحث عن قارئ" />
      {notice && <p className="mb-3 rounded-2xl bg-gold/10 px-4 py-2.5 text-sm text-gold-bright" role="status">{notice}</p>}
      {loading && <p className="animate-pulse py-6 text-center text-sm text-[var(--muted-on-night)]">جارٍ تحميل القرّاء…</p>}
      {!loading && reciters && list.length === 0 && <p className="py-6 text-center text-sm text-[var(--muted-on-night)]">لا توجد نتائج.</p>}
      <ul className="space-y-1">
        {list.map((r) => (
          <li key={r.id}>
            <button onClick={() => onPick(r)} className={`pressable focus-ring flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-start ${r.name === currentName ? "bg-gold/15" : "hover:bg-white/[0.05]"}`}>
              <ArtMedallion seed={String(r.id)} glyph={r.name.trim().charAt(0)} className="w-11 text-lg" />
              <span className="text-[15px] text-[var(--text-on-night)]">{r.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
