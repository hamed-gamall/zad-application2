"use client";

import { useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import type { SurahMeta } from "@/lib/types";

// Jump to any surah. Used by both Quran readers.
export default function SurahPickerSheet({
  open,
  onClose,
  surahList,
  current,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  surahList: SurahMeta[];
  current: number;
  onPick: (surahNumber: number) => void;
}) {
  const [q, setQ] = useState("");
  const items = surahList.map((s, i) => ({ s, n: i + 1 })).filter(({ s, n }) => !q.trim() || s.titleAr.includes(q.trim()) || String(n) === q.trim());
  return (
    <BottomSheet open={open} onClose={onClose} title="الانتقال إلى سورة">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="اسم السورة أو رقمها" className="field mb-3" aria-label="بحث عن سورة" />
      <ul className="grid grid-cols-2 gap-1.5">
        {items.map(({ s, n }) => (
          <li key={n}>
            <button
              onClick={() => { onPick(n); onClose(); }}
              aria-current={n === current ? "true" : undefined}
              className={`pressable focus-ring flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start ${n === current ? "bg-gold/15 text-gold-bright" : "bg-white/[0.04] text-[var(--text-on-night)]"}`}
            >
              <span className="w-7 text-xs tabular-nums text-[var(--muted-on-night)]">{n}</span>
              <span className="font-display text-lg">{s.titleAr}</span>
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
