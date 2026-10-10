"use client";

import { useEffect, useRef, useState } from "react";
import { useAudioPlayer } from "./AudioPlayerProvider";
import { getFavorites, toggleFavorite } from "@/lib/storage";
import ArtMedallion from "@/components/ui/ArtMedallion";
import BottomSheet from "@/components/ui/BottomSheet";
import AudioVisualizer from "./AudioVisualizer";

const ico = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const RATES = [0.75, 1, 1.25, 1.5, 2];
const SLEEP = [15, 30, 45, 60];

function fmt(sec: number) {
  if (!isFinite(sec) || sec < 0) return "٠٠:٠٠";
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  const p = (n: number) => String(n).padStart(2, "0");
  return (h ? `${p(h)}:` : "") + `${p(m)}:${p(s)}`;
}

// Full-screen listening: atmosphere, a large emblem, one dominant play
// control. Opened from the floating player; swipe down or tap ⌄ to close.
export default function FullScreenPlayer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = useAudioPlayer();
  const t = p.currentTrack;
  const [fav, setFav] = useState(false);
  const [sheet, setSheet] = useState<null | "queue" | "speed" | "sleep">(null);
  const [sleepAt, setSleepAt] = useState<number | null>(null);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!t?.favorite) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFav(false);
      return;
    }
    setFav(getFavorites().some((f) => f.id === t.favorite!.id));
  }, [t?.favorite]);

  useEffect(() => {
    if (!sleepAt) return;
    const ms = sleepAt - Date.now();
    const id = setTimeout(() => { p.pause(); setSleepAt(null); }, Math.max(0, ms));
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepAt]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", esc); };
  }, [open, onClose]);

  if (!t) return null;
  const live = !!t.live;

  function toggleFav() {
    if (!t?.favorite) return;
    const { id, type, label, href } = t.favorite;
    setFav(toggleFavorite({ id, type, label, text: "", savedAt: Date.now(), href }).some((f) => f.id === id));
  }
  async function share() {
    const data = { title: t!.title, text: `${t!.title} — ${t!.subtitle}` };
    try { if (navigator.share) await navigator.share(data); else await navigator.clipboard.writeText(data.text); } catch { /* cancelled */ }
  }

  return (
    <div
      role="dialog" aria-modal="true" aria-label="المشغّل" aria-hidden={!open}
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden px-7 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))]"
      style={{ transform: open ? "none" : "translateY(104%)", transition: "transform .55s var(--ease-spring)", background: "radial-gradient(90% 50% at 50% 28%, var(--atmos-glow), transparent 70%), linear-gradient(180deg,var(--atmos-a),var(--atmos-c) 70%)", visibility: open ? "visible" : "hidden" }}
      onTouchStart={(e) => (startY.current = e.touches[0].clientY)}
      onTouchEnd={(e) => { if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 110) onClose(); startY.current = null; }}
    >
      <div className="flex items-center justify-between">
        <button onClick={onClose} aria-label="إغلاق" className="fcontrol focus-ring"><svg {...ico}><path d="m6 9 6 6 6-6" /></svg></button>
        <p className="text-sm text-[var(--muted-on-night)]">{live ? "بث مباشر" : "يُشغَّل الآن"}</p>
        <button onClick={() => setSheet("queue")} aria-label="قائمة التشغيل" className="fcontrol focus-ring"><svg {...ico}><path d="M4 7h16M4 12h16M4 17h8M16 15v6l4-3z" /></svg></button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-7">
        <div className="relative w-[min(72vw,320px)]">
          <div aria-hidden className="absolute -inset-6 rounded-full" style={{ background: "radial-gradient(circle, rgba(227,201,135,.22), transparent 65%)", opacity: p.playing ? 1 : .4, transition: "opacity .8s" }} />
          <ArtMedallion seed={t.subtitle || t.title} glyph={t.title.trim().charAt(0)} className="relative w-full text-[5rem] shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)]" rounded="rounded-[18%]" />
          {live && <span className="absolute start-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />مباشر</span>}
        </div>
        <div className="w-full text-center">
          <h2 className="font-display truncate text-4xl text-[var(--ivory)]">{t.title}</h2>
          <p className={`mt-1 truncate text-sm ${p.error ? "text-gold-bright" : "text-[var(--muted-on-night)]"}`}>{p.error ? "تعذّر التشغيل — اضغط إعادة المحاولة" : p.loading ? "جارٍ التحميل…" : t.subtitle}</p>
        </div>
        <AudioVisualizer active={p.playing && !p.loading} />
      </div>

      <div className="mx-auto w-full max-w-md">
        {!live && (
          <div className="mb-5">
            <input type="range" min={0} max={p.duration || 0} step={0.1} value={Math.min(p.currentTime, p.duration || 0)} onChange={(e) => p.seek(Number(e.target.value))} aria-label="التقدم" className="w-full accent-[var(--gold)]" dir="ltr" />
            <div className="mt-1 flex justify-between text-xs tabular-nums text-[var(--muted-on-night)]" dir="ltr"><span>{fmt(p.currentTime)}</span><span>{fmt(p.duration)}</span></div>
          </div>
        )}
        <div className="flex items-center justify-between" dir="ltr">
          {!live ? <button onClick={() => p.seek(Math.max(0, p.currentTime - 10))} aria-label="رجوع ١٠ ثوانٍ" className="fcontrol focus-ring !h-14 !w-14"><svg {...ico}><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" /><text x="9" y="15.5" fontSize="7.5" fill="currentColor" stroke="none">10</text></svg></button> : <span className="w-14" />}
          <button onClick={p.prev} disabled={!p.hasPrev} aria-label="السابق" className="fcontrol focus-ring !h-14 !w-14 disabled:opacity-30"><svg {...ico} fill="currentColor"><path d="M6 5v14M19 5v14l-11-7z" /></svg></button>
          <button onClick={p.error ? p.retry : p.togglePlay} aria-label={p.playing ? "إيقاف مؤقت" : "تشغيل"} className="pressable focus-ring flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-gold-bright to-gold text-[#1a1407] shadow-[0_18px_50px_-10px_rgba(200,164,90,.6)]">
            {p.playing ? <svg width="38" height="38" viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.2" /><rect x="13.5" y="5" width="4" height="14" rx="1.2" /></svg> : <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
          </button>
          <button onClick={p.next} disabled={!p.hasNext} aria-label="التالي" className="fcontrol focus-ring !h-14 !w-14 disabled:opacity-30"><svg {...ico} fill="currentColor"><path d="M18 5v14M5 5v14l11-7z" /></svg></button>
          {!live ? <button onClick={() => p.seek(Math.min(p.duration || 0, p.currentTime + 10))} aria-label="تقديم ١٠ ثوانٍ" className="fcontrol focus-ring !h-14 !w-14"><svg {...ico}><path d="M20 12a8 8 0 1 1-3-6.2M20 4v4h-4" /><text x="9" y="15.5" fontSize="7.5" fill="currentColor" stroke="none">10</text></svg></button> : <span className="w-14" />}
        </div>
        <div className="mt-6 flex items-center justify-center gap-2">
          {!live && <button onClick={() => setSheet("speed")} className="fcontrol focus-ring tabular-nums" aria-label="سرعة التشغيل">{p.rate}×</button>}
          {!live && <button onClick={() => setSheet("sleep")} className={`fcontrol focus-ring ${sleepAt ? "fcontrol-on" : ""}`} aria-label="مؤقّت النوم"><svg {...ico}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg></button>}
          {t.favorite && <button onClick={toggleFav} aria-pressed={fav} aria-label={fav ? "إزالة من المفضلة" : "أضف إلى المفضلة"} className={`fcontrol focus-ring ${fav ? "fcontrol-on" : ""}`}><svg {...ico} fill={fav ? "currentColor" : "none"}><path d="M12 21s-7-4.35-9.5-8.5C1 9 2.5 5.5 6 5c2-.3 3.7.7 6 3 2.3-2.3 4-3.3 6-3 3.5.5 5 4 3.5 7.5C19 16.65 12 21 12 21z" /></svg></button>}
          <button onClick={share} className="fcontrol focus-ring" aria-label="مشاركة"><svg {...ico}><circle cx="6" cy="12" r="2.2" /><circle cx="17" cy="6" r="2.2" /><circle cx="17" cy="18" r="2.2" /><path d="m8 11 7-4M8 13l7 4" /></svg></button>
          {!live && <a href={t.downloadUrl ?? t.url} download target="_blank" rel="noopener noreferrer" className="fcontrol focus-ring" aria-label="تحميل"><svg {...ico}><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" /></svg></a>}
        </div>
      </div>

      <BottomSheet open={sheet === "queue"} onClose={() => setSheet(null)} title="قائمة التشغيل">
        <ol className="space-y-1">
          {p.playlist.map((tr, i) => (
            <li key={tr.id}>
              <button onClick={() => { p.playPlaylist(p.playlist, i); setSheet(null); }} className={`pressable focus-ring flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start ${i === p.index ? "bg-gold/15 text-gold-bright" : "hover:bg-white/[0.05]"}`}>
                <span className="w-6 text-xs tabular-nums text-[var(--muted-on-night)]">{(i + 1).toLocaleString("ar-EG")}</span>
                <span className="truncate">{tr.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </BottomSheet>
      <BottomSheet open={sheet === "speed"} onClose={() => setSheet(null)} title="سرعة التشغيل">
        <div className="flex flex-wrap gap-2">{RATES.map((r) => <button key={r} aria-pressed={p.rate === r} onClick={() => { p.setRate(r); setSheet(null); }} className="chip focus-ring !h-11 tabular-nums">{r}×</button>)}</div>
      </BottomSheet>
      <BottomSheet open={sheet === "sleep"} onClose={() => setSheet(null)} title="مؤقّت النوم">
        <div className="flex flex-wrap gap-2">
          {SLEEP.map((m) => <button key={m} onClick={() => { setSleepAt(Date.now() + m * 60000); setSheet(null); }} className="chip focus-ring !h-11">{m.toLocaleString("ar-EG")} دقيقة</button>)}
          {sleepAt && <button onClick={() => { setSleepAt(null); setSheet(null); }} className="chip focus-ring !h-11">إلغاء المؤقّت</button>}
        </div>
      </BottomSheet>
    </div>
  );
}
