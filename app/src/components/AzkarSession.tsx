"use client";

import { useEffect, useRef, useState } from "react";
import type { AzkarCategory } from "@/lib/types";
import CopyShareBar from "@/components/CopyShareBar";
import { isFavorite, toggleFavorite } from "@/lib/storage";
import ImmersiveScreen from "@/components/ui/ImmersiveScreen";
import FloatingControl from "@/components/ui/FloatingControl";
import BottomSheet from "@/components/ui/BottomSheet";
import CircularCounter from "@/components/ui/CircularCounter";
import SceneArt from "@/components/ui/SceneArt";

const ico = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const ar = (n: number) => n.toLocaleString("ar-EG");

// One dhikr at a time. The ring under your thumb is the whole interaction:
// tap to count, swipe sideways once it fills.
export default function AzkarSession({ category }: { category: AzkarCategory }) {
  const items = category.items;
  const [idx, setIdx] = useState(0);
  const [counts, setCounts] = useState<Record<number, number>>(() => Object.fromEntries(items.map((it) => [it.id, 0])));
  const [favs, setFavs] = useState<Record<number, boolean>>({});
  const [pulse, setPulse] = useState(0);
  const [sheet, setSheet] = useState<null | "share" | "list">(null);
  const [slide, setSlide] = useState<"next" | "prev">("next");
  const touch = useRef<{ x: number; y: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavs(Object.fromEntries(items.map((it) => [it.id, isFavorite(`azkar:${category.id}:${it.id}`)])));
  }, [category, items]);

  const item = items[idx];
  const count = counts[item.id] ?? 0;
  const finished = count >= item.count;
  const done = items.filter((it) => (counts[it.id] ?? 0) >= it.count).length;
  const allDone = done === items.length;

  function go(n: number) {
    if (n < 0 || n >= items.length) return;
    audioRef.current?.pause();
    setPlaying(false);
    setSlide(n > idx ? "next" : "prev");
    setIdx(n);
  }
  function tap() {
    if (finished) return go(idx + 1);
    setCounts((c) => ({ ...c, [item.id]: Math.min((c[item.id] ?? 0) + 1, item.count) }));
    setPulse((p) => p + 1);
    if (navigator.vibrate) navigator.vibrate(count + 1 >= item.count ? [18, 40, 18] : 8);
  }
  function fav() {
    toggleFavorite({ id: `azkar:${category.id}:${item.id}`, type: "azkar", label: category.category, text: item.text, savedAt: Date.now() });
    setFavs((f) => ({ ...f, [item.id]: !f[item.id] }));
  }
  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    else { a.pause(); setPlaying(false); }
  }
  function onTouchEnd(e: React.TouchEvent) {
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    go(dx < 0 ? idx + 1 : idx - 1);
  }

  const long = item.text.length > 180;

  return (
    <ImmersiveScreen
      dark
      background={<SceneArt variant="mountains" moon={false} className="absolute inset-0 !mask-none opacity-90" />}
      backHref="/azkar"
      title={category.category}
      subtitle={`${ar(idx + 1)} من ${ar(items.length)} · أُنجز ${ar(done)}`}
      top={
        <FloatingControl label="كل الأذكار" onClick={() => setSheet("list")}>
          <svg {...ico}><path d="M4 7h16M4 12h16M4 17h10" /></svg>
        </FloatingControl>
      }
      bottom={
        <>
          <FloatingControl label="إعادة العدّ" onClick={() => setCounts((c) => ({ ...c, [item.id]: 0 }))}>
            <svg {...ico}><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" /></svg>
          </FloatingControl>
          <FloatingControl label={favs[item.id] ? "إزالة من المفضلة" : "أضف إلى المفضلة"} active={!!favs[item.id]} onClick={fav}>
            <svg {...ico} fill={favs[item.id] ? "currentColor" : "none"}><path d="M12 21s-7-4.35-9.5-8.5C1 9 2.5 5.5 6 5c2-.3 3.7.7 6 3 2.3-2.3 4-3.3 6-3 3.5.5 5 4 3.5 7.5C19 16.65 12 21 12 21z" /></svg>
          </FloatingControl>
          {item.audio && (
            <FloatingControl label={playing ? "إيقاف الصوت" : "تشغيل الصوت"} active={playing} onClick={togglePlay}>
              {playing ? <svg {...ico} fill="currentColor"><rect x="7" y="5" width="3.5" height="14" rx="1" /><rect x="13.5" y="5" width="3.5" height="14" rx="1" /></svg> : <svg {...ico} fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
            </FloatingControl>
          )}
          <FloatingControl label="نسخ ومشاركة" onClick={() => setSheet("share")}>
            <svg {...ico}><circle cx="6" cy="12" r="2.2" /><circle cx="17" cy="6" r="2.2" /><circle cx="17" cy="18" r="2.2" /><path d="m8 11 7-4M8 13l7 4" /></svg>
          </FloatingControl>
        </>
      }
    >
      <div className="absolute inset-0 flex flex-col items-center px-6 pb-[calc(96px+env(safe-area-inset-bottom))] pt-[calc(84px+env(safe-area-inset-top))]" onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })} onTouchEnd={onTouchEnd}>
        {item.audio && <audio ref={audioRef} src={item.audio} preload="none" onEnded={() => setPlaying(false)} />}

        <div key={item.id} data-dir={slide} className="page-turn flex min-h-0 w-full max-w-xl flex-1 flex-col items-center">
          <div className="flex min-h-0 w-full flex-1 items-center overflow-y-auto">
            <p className={`font-quran m-auto text-center text-[var(--ivory)] ${long ? "text-2xl leading-[2.3]" : "text-4xl leading-[2.1]"}`} dir="rtl" lang="ar">{item.text}</p>
          </div>

          <button onClick={tap} aria-label={finished ? "الذكر التالي" : `عدّ، الحالي ${count} من ${item.count}`} className="focus-ring mt-4 shrink-0 rounded-full active:scale-[0.97]" style={{ transition: "transform .2s var(--ease-spring)" }}>
            <CircularCounter value={count} total={item.count} size={200} stroke={7} pulse={pulse} complete={finished}>
              {finished ? (
                <>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold-bright)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                  <span className="mt-1 text-xs text-gold-bright">{idx < items.length - 1 ? "اضغط للتالي" : allDone ? "أتممت الأذكار" : ""}</span>
                </>
              ) : (
                <>
                  <span className="font-display text-6xl leading-none tabular-nums text-[var(--ivory)]">{ar(count)}</span>
                  <span className="mt-1 text-xs text-[var(--muted-on-night)]">من {ar(item.count)}</span>
                </>
              )}
            </CircularCounter>
          </button>
          <div className="mt-3 flex items-center gap-1.5" aria-hidden>
            {items.length <= 14 && items.map((it, i) => <span key={it.id} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-gold" : (counts[it.id] ?? 0) >= it.count ? "w-1.5 bg-gold/60" : "w-1.5 bg-white/20"}`} />)}
          </div>
          {allDone && <p className="font-display mt-2 text-center text-lg text-gold-bright">تقبّل الله طاعتكم</p>}
        </div>
      </div>

      <BottomSheet open={sheet === "share"} onClose={() => setSheet(null)} title="نسخ ومشاركة">
        <p className="font-quran mb-4 text-xl leading-[2.1] text-[var(--ivory)]" dir="rtl">{item.text}</p>
        <CopyShareBar text={item.text} shareTitle={category.category} />
      </BottomSheet>
      <BottomSheet open={sheet === "list"} onClose={() => setSheet(null)} title={category.category}>
        <ol className="space-y-1">
          {items.map((it, i) => (
            <li key={it.id}>
              <button onClick={() => { go(i); setSheet(null); }} className={`pressable focus-ring flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-start ${i === idx ? "bg-gold/15" : "hover:bg-white/[0.05]"}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${(counts[it.id] ?? 0) >= it.count ? "bg-gold text-[#1a1407]" : "bg-white/10 text-[var(--muted-on-night)]"}`}>{(counts[it.id] ?? 0) >= it.count ? "✓" : ar(i + 1)}</span>
                <span className="line-clamp-2 text-sm text-[var(--text-on-night)]">{it.text}</span>
              </button>
            </li>
          ))}
        </ol>
      </BottomSheet>
    </ImmersiveScreen>
  );
}
