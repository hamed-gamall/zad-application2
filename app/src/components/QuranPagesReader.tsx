"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SurahMeta } from "@/lib/types";
import { mushafPageImageUrl, TOTAL_MUSHAF_PAGES, fetchReciters, surahAudioUrl, type ReciterInfo } from "@/lib/live";
import { getPrefs, DEFAULT_PREFS, setPrefs, setPageProgress, isPageBookmarked, togglePageBookmark, type ReadingPrefs } from "@/lib/storage";
import ImmersiveScreen from "@/components/ui/ImmersiveScreen";
import FloatingControl from "@/components/ui/FloatingControl";
import BottomSheet from "@/components/ui/BottomSheet";
import SurahPickerSheet from "@/components/ui/SurahPickerSheet";
import ReciterPickerSheet from "@/components/ui/ReciterPickerSheet";

const ico = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

// The Mushaf page IS the interface: it fills the screen, swipe turns it like
// paper, and every control stays hidden until you tap.
export default function QuranPagesReader({
  initialPage,
  surahList,
  onSwitchMode,
}: {
  initialPage: number;
  surahList: SurahMeta[];
  onSwitchMode?: () => void;
}) {
  const [page, setPage] = useState(() => Math.min(Math.max(initialPage, 1), TOTAL_MUSHAF_PAGES));
  const [dir, setDir] = useState<"next" | "prev">("next");
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [bookmarked, setBookmarked] = useState(false);
  const [sheet, setSheet] = useState<null | "surahs" | "reciter" | "jump">(null);
  const [reciters, setReciters] = useState<ReciterInfo[] | null>(null);
  const [reciterLoading, setReciterLoading] = useState(false);
  const [reciterNotice, setReciterNotice] = useState<string | null>(null);
  const [prefs, setPrefsState] = useState<ReadingPrefs>(DEFAULT_PREFS);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefsState(getPrefs());
  }, []);

  useEffect(() => {
    const dwell = setTimeout(() => { moved.current = true; setPageProgress({ page, updatedAt: Date.now() }); }, 8000);
    return () => clearTimeout(dwell);
  }, [page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImgError(false);
    setImgLoading(true);
    setBookmarked(isPageBookmarked(page));
    // Only count it as "reading" once the person turns a page (or lingers).
    if (moved.current) setPageProgress({ page, updatedAt: Date.now() });
    if (page < TOTAL_MUSHAF_PAGES) new Image().src = mushafPageImageUrl(page + 1);
  }, [page]);

  const surahsOnPage = useMemo(
    () =>
      surahList
        .map((s, i) => ({ ...s, number: i + 1 }))
        .filter((s, i, arr) => {
          const start = Number(s.page || s.pages || 1);
          const next = arr[i + 1] ? Number(arr[i + 1].page || arr[i + 1].pages || start) : TOTAL_MUSHAF_PAGES + 1;
          return page >= start && page < next;
        }),
    [surahList, page]
  );
  const primary = surahsOnPage[0] ?? null;

  const goTo = useCallback((n: number, d?: "next" | "prev") => {
    const t = Math.min(Math.max(n, 1), TOTAL_MUSHAF_PAGES);
    moved.current = true;
    setPage((cur) => {
      if (t !== cur) setDir(d ?? (t > cur ? "next" : "prev"));
      return t;
    });
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goTo(page + 1, "next");
      if (e.key === "ArrowRight") goTo(page - 1, "prev");
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [page, goTo]);

  function updatePrefs(p: Partial<ReadingPrefs>) {
    setPrefs(p);
    setPrefsState(getPrefs());
  }

  async function openReciters() {
    setSheet("reciter");
    if (reciters || reciterLoading) return;
    setReciterLoading(true);
    try {
      setReciters(await fetchReciters());
    } catch {
      setReciters([]);
    } finally {
      setReciterLoading(false);
    }
  }

  function pickReciter(r: ReciterInfo) {
    if (!primary) return;
    const m = r.moshaf.find((x) => x.surah_list.split(",").map((n) => Number(n.trim())).includes(primary.number));
    if (!m) {
      setReciterNotice("هذا القارئ لا يقرأ هذه السورة، اختر قارئًا آخر.");
      return;
    }
    setReciterNotice(null);
    updatePrefs({ reciterServer: m.server, reciterName: r.name });
    setPlaying(false);
    setSheet(null);
  }

  const audioSrc = prefs.reciterServer && primary ? surahAudioUrl(prefs.reciterServer, primary.number) : null;

  function togglePlay() {
    if (!audioSrc) return openReciters();
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    else {
      a.pause();
      setPlaying(false);
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    const s = touch.current;
    touch.current = null;
    if (!s || zoom > 1) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    // Arabic book: page forward = swipe toward the left.
    if (dx < 0) goTo(page + 1, "next");
    else goTo(page - 1, "prev");
  }


  return (
    <ImmersiveScreen
      paper
      backHref="/quran"
      title={primary ? `سورة ${primary.titleAr}` : undefined}
      subtitle={`صفحة ${page} من ${TOTAL_MUSHAF_PAGES}`}
      top={
        <>
          <FloatingControl label={bookmarked ? "إزالة حفظ الصفحة" : "حفظ الصفحة"} active={bookmarked} onClick={() => { togglePageBookmark(page, primary?.number); setBookmarked((b) => !b); }}>
            <svg {...ico} fill={bookmarked ? "currentColor" : "none"}><path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" /></svg>
          </FloatingControl>
          {onSwitchMode && (
            <FloatingControl label="قراءة النص" onClick={onSwitchMode}>
              <svg {...ico}><path d="M4 6h16M4 11h16M4 16h10" /></svg>
            </FloatingControl>
          )}
        </>
      }
      bottom={
        <>
          <FloatingControl label="الانتقال إلى سورة" onClick={() => setSheet("surahs")}>
            <svg {...ico}><path d="M4 5.5c2.4-1 5-1 8 .3v13c-3-1.3-5.6-1.3-8-.3zM20 5.5c-2.4-1-5-1-8 .3v13c3-1.3 5.6-1.3 8-.3z" /></svg>
          </FloatingControl>
          <FloatingControl label="الانتقال إلى صفحة" onClick={() => setSheet("jump")}>
            <span className="tabular-nums">{page}</span>
          </FloatingControl>
          <FloatingControl label={playing ? "إيقاف التلاوة" : "تشغيل التلاوة"} active={playing} onClick={togglePlay}>
            {playing ? <svg {...ico} fill="currentColor"><rect x="7" y="5" width="3.5" height="14" rx="1" /><rect x="13.5" y="5" width="3.5" height="14" rx="1" /></svg> : <svg {...ico} fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
          </FloatingControl>
          <FloatingControl label="القارئ" onClick={openReciters}>
            <svg {...ico}><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /></svg>
          </FloatingControl>
          <FloatingControl label="تكبير" active={zoom > 1} onClick={() => setZoom((z) => (z >= 1.6 ? 1 : +(z + 0.3).toFixed(1)))}>
            <svg {...ico}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.4-4.4M11 8v6M8 11h6" /></svg>
          </FloatingControl>
        </>
      }
    >
      {audioSrc && <audio ref={audioRef} src={audioSrc} onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} preload="none" />}

      <div
        className="absolute inset-0 overflow-auto"
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={onTouchEnd}
        style={{ touchAction: zoom > 1 ? "pan-x pan-y" : "pan-y", paddingTop: "env(safe-area-inset-top)" }}
      >
        {/* The page IS the screen: no frame, no card — paper-coloured edge to edge. */}
        <div key={page} data-dir={dir} className="page-turn relative mx-auto" style={{ width: `${zoom * 100}%`, height: zoom === 1 ? "100%" : "auto", mixBlendMode: "multiply" }}>
          {imgError ? (
            <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 p-10 text-center text-[#3a2f14]">
              <p className="font-display text-2xl">تعذّر تحميل هذه الصفحة</p>
              <p className="text-sm opacity-70">تحقق من اتصالك بالإنترنت ثم أعد المحاولة.</p>
              <button onClick={() => { setImgError(false); setImgLoading(true); }} className="pressable focus-ring rounded-full bg-[#1f6f5c] px-6 py-2.5 text-sm font-semibold text-white">إعادة المحاولة</button>
            </div>
          ) : (
            <>
              {imgLoading && <div className="absolute inset-0 animate-pulse bg-[#e6dbbc]/60" aria-hidden />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mushafPageImageUrl(page)}
                alt={`صفحة ${page} من المصحف الشريف`}
                draggable={false}
                style={{ width: "100%", height: zoom === 1 ? "100%" : "auto", objectFit: "contain" }}
                className="relative block select-none"
                onLoad={() => setImgLoading(false)}
                onError={() => { setImgLoading(false); setImgError(true); }}
              />
            </>
          )}
        </div>
      </div>

      <SurahPickerSheet open={sheet === "surahs"} onClose={() => setSheet(null)} surahList={surahList} current={primary?.number ?? 1} onPick={(n) => goTo(Number(surahList[n - 1].page || surahList[n - 1].pages || 1))} />
      <ReciterPickerSheet open={sheet === "reciter"} onClose={() => setSheet(null)} reciters={reciters} loading={reciterLoading} notice={reciterNotice} currentName={prefs.reciterName} onPick={pickReciter} />
      <BottomSheet open={sheet === "jump"} onClose={() => setSheet(null)} title="الانتقال إلى صفحة">
        <JumpForm max={TOTAL_MUSHAF_PAGES} value={page} onGo={(n) => { goTo(n); setSheet(null); }} />
      </BottomSheet>
    </ImmersiveScreen>
  );
}

function JumpForm({ max, value, onGo }: { max: number; value: number; onGo: (n: number) => void }) {
  const [v, setV] = useState(String(value));
  return (
    <div className="flex items-center gap-3">
      <input type="number" inputMode="numeric" min={1} max={max} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onGo(Number(v) || 1)} className="field text-center text-xl tabular-nums" aria-label="رقم الصفحة" />
      <button onClick={() => onGo(Number(v) || 1)} className="pressable focus-ring h-[52px] shrink-0 rounded-full bg-gradient-to-l from-gold-bright to-gold px-7 font-semibold text-[#1a1407]">اذهب</button>
    </div>
  );
}
