"use client";

import { useEffect, useState } from "react";
import type { DuaItem } from "@/lib/types";
import { isFavorite, toggleFavorite } from "@/lib/storage";
import CopyShareBar from "@/components/CopyShareBar";
import BottomSheet from "@/components/ui/BottomSheet";
import Ornament from "@/components/ui/Ornament";

// One dua as a passage on the page: large text, a quiet action row, no box.
export default function DuaFavoriteItem({ categoryName, index, item }: { categoryName: string; index: number; item: DuaItem }) {
  const id = `dua:${categoryName}:${index}`;
  const [fav, setFav] = useState(false);
  const [share, setShare] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFav(isFavorite(id));
  }, [id]);

  return (
    <li className="py-8 text-center">
      <p className="font-quran text-[27px] leading-[2.2] text-[var(--ivory)]" dir="rtl" lang="ar">{item.text}</p>
      {(item.reference || item.count) && (
        <p className="mt-3 text-xs text-[var(--muted-on-night)]">
          {item.reference}{item.reference && item.count ? " · " : ""}{item.count ? `يُكرَّر ${item.count}` : ""}
        </p>
      )}
      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          aria-pressed={fav}
          aria-label={fav ? "إزالة من المفضلة" : "أضف إلى المفضلة"}
          onClick={() => { toggleFavorite({ id, type: "dua", label: categoryName, text: item.text, savedAt: Date.now() }); setFav((f) => !f); }}
          className={`fcontrol focus-ring ${fav ? "fcontrol-on" : ""}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.35-9.5-8.5C1 9 2.5 5.5 6 5c2-.3 3.7.7 6 3 2.3-2.3 4-3.3 6-3 3.5.5 5 4 3.5 7.5C19 16.65 12 21 12 21z" /></svg>
        </button>
        <button aria-label="نسخ ومشاركة" onClick={() => setShare(true)} className="fcontrol focus-ring">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="12" r="2.2" /><circle cx="17" cy="6" r="2.2" /><circle cx="17" cy="18" r="2.2" /><path d="m8 11 7-4M8 13l7 4" /></svg>
        </button>
      </div>
      <Ornament className="mt-8 opacity-70" />
      <BottomSheet open={share} onClose={() => setShare(false)} title="نسخ ومشاركة">
        <CopyShareBar text={item.text} shareTitle={categoryName} />
      </BottomSheet>
    </li>
  );
}
