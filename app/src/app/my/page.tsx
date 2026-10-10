"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBookmarks, getFavorites, getPageBookmarks, type QuranBookmark, type FavoriteItem, type PageBookmark } from "@/lib/storage";
import CopyShareBar from "@/components/CopyShareBar";
import ScreenHeader from "@/components/ui/ScreenHeader";
import ArtMedallion from "@/components/ui/ArtMedallion";
import BottomSheet from "@/components/ui/BottomSheet";

const ar = (n: number) => n.toLocaleString("ar-EG");
type Tab = "quran" | "texts" | "audio";

// Your library: one calm place, three tabs. Everything stays on this device.
export default function MySavedPage() {
  const [bookmarks, setBookmarks] = useState<QuranBookmark[]>([]);
  const [pageBookmarks, setPageBookmarks] = useState<PageBookmark[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [tab, setTab] = useState<Tab>("quran");
  const [share, setShare] = useState<FavoriteItem | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBookmarks(getBookmarks());
    setPageBookmarks(getPageBookmarks());
    setFavorites(getFavorites());
  }, []);

  const texts = favorites.filter((f) => f.type !== "audio" && f.type !== "radio");
  const audio = favorites.filter((f) => f.type === "audio" || f.type === "radio");
  const empty = (msg: string, href: string, cta: string) => (
    <div className="py-16 text-center">
      <svg aria-hidden viewBox="0 0 80 80" className="mx-auto mb-4 h-20 w-20 text-gold/50"><path d="M40 6l9 9h13v13l9 9-9 9v13H49l-9 9-9-9H18V46l-9-9 9-9V15h13z" fill="none" stroke="currentColor" strokeWidth="1.2" /><path d="M40 28l12 12-12 12-12-12z" fill="rgba(200,164,90,.12)" stroke="currentColor" strokeWidth="1" /></svg>
      <p className="text-sm text-[var(--muted-on-night)]">{msg}</p>
      <Link href={href} className="pressable focus-ring mt-4 inline-flex h-11 items-center rounded-full bg-white/[0.08] px-6 text-sm text-gold-bright">{cta}</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="مكتبتي" subtitle="محفوظ على جهازك فقط" />
      <div className="flex gap-2 px-6" role="group" aria-label="الأقسام">
        {([["quran", "القرآن"], ["texts", "أذكار وأحاديث"], ["audio", "صوتيات"]] as const).map(([k, l]) => (
          <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)} className="chip focus-ring">{l}</button>
        ))}
      </div>

      <div className="px-6 pt-4">
        {tab === "quran" && (bookmarks.length + pageBookmarks.length === 0 ? empty("لم تحفظ أي موضع بعد.", "/quran", "ابدأ القراءة") : (
          <ul>
            {bookmarks.map((b, i) => (
              <li key={`a${i}`}><Link href={`/quran/${b.surah}?ayah=${b.ayah}`} className="pressable focus-ring flex items-center gap-4 rounded-2xl px-1 py-3 hover:bg-white/[0.04]">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/50 text-sm tabular-nums text-gold-bright">{ar(b.ayah)}</span>
                <span className="font-display flex-1 text-xl text-[var(--ivory)]">سورة {b.surahName}</span>
                <span className="text-xs text-[var(--muted-on-night)]">الآية {ar(b.ayah)}</span>
              </Link></li>
            ))}
            {pageBookmarks.map((b, i) => (
              <li key={`p${i}`}><Link href={b.surah ? `/quran/${b.surah}?page=${b.page}` : `/quran/1?page=${b.page}`} className="pressable focus-ring flex items-center gap-4 rounded-2xl px-1 py-3 hover:bg-white/[0.04]">
                <span className="mushaf-thumb flex h-11 w-9 items-center justify-center rounded-[3px] text-[11px] tabular-nums">{ar(b.page)}</span>
                <span className="font-display flex-1 text-xl text-[var(--ivory)]">صفحة {ar(b.page)}</span>
                <span className="text-xs text-[var(--muted-on-night)]">المصحف</span>
              </Link></li>
            ))}
          </ul>
        ))}

        {tab === "texts" && (texts.length === 0 ? empty("لا توجد نصوص مفضّلة بعد.", "/azkar", "تصفّح الأذكار") : (
          <ul>
            {texts.map((f) => (
              <li key={f.id} className="border-b border-white/[0.06] py-6 last:border-0">
                <p className="font-quran text-2xl leading-[2.1] text-[var(--ivory)]" dir="rtl">{f.text}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gold-bright">{f.label}</span>
                  <button onClick={() => setShare(f)} className="fcontrol focus-ring" aria-label="نسخ ومشاركة"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="12" r="2.2" /><circle cx="17" cy="6" r="2.2" /><circle cx="17" cy="18" r="2.2" /><path d="m8 11 7-4M8 13l7 4" /></svg></button>
                </div>
              </li>
            ))}
          </ul>
        ))}

        {tab === "audio" && (audio.length === 0 ? empty("لا توجد تلاوات أو إذاعات مفضّلة.", "/reciters", "اختر قارئًا") : (
          <ul>
            {audio.map((f) => (
              <li key={f.id}><Link href={f.href ?? (f.type === "radio" ? "/tools/radio" : "/reciters")} className="pressable focus-ring flex items-center gap-4 rounded-2xl px-1 py-2.5 hover:bg-white/[0.04]">
                <ArtMedallion seed={f.label} glyph={f.type === "radio" ? "◉" : "♪"} className="w-12 text-xl" rounded="rounded-2xl" />
                <span className="min-w-0 flex-1"><span className="line-clamp-2 block text-[15px] text-[var(--ivory)]">{f.label}</span><span className="text-xs text-[var(--muted-on-night)]">{f.type === "radio" ? "إذاعة" : "تلاوة"}</span></span>
              </Link></li>
            ))}
          </ul>
        ))}
      </div>

      <BottomSheet open={!!share} onClose={() => setShare(null)} title="نسخ ومشاركة">
        {share && <CopyShareBar text={share.text} shareTitle={share.label} />}
      </BottomSheet>
    </div>
  );
}
