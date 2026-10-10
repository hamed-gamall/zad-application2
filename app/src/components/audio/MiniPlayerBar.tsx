"use client";

import { useState } from "react";
import { useAudioPlayer } from "./AudioPlayerProvider";
import ArtMedallion from "@/components/ui/ArtMedallion";
import FullScreenPlayer from "./FullScreenPlayer";

// Floating audio state: a quiet pill above the dock, not a website player
// bar. Tap it to expand into the full-screen player.
export default function MiniPlayerBar() {
  const { currentTrack, playing, loading, error, currentTime, duration, togglePlay, retry, stop } = useAudioPlayer();
  const [open, setOpen] = useState(false);
  if (!currentTrack) return null;
  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <>
      <div className="fixed inset-x-0 bottom-[calc(5.4rem+env(safe-area-inset-bottom))] z-40 mx-3 overflow-hidden rounded-[26px] glass lg:mx-auto lg:max-w-xl">
        <div className="flex items-center gap-3 p-2 pe-3">
          <button onClick={() => setOpen(true)} className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-start" aria-label="فتح المشغّل">
            <ArtMedallion seed={currentTrack.subtitle || currentTrack.title} glyph={currentTrack.title.trim().charAt(0)} className="w-11 shrink-0 text-lg" rounded="rounded-2xl" />
            <span className="min-w-0 flex-1">
              <span className="font-display block truncate text-lg leading-tight text-[var(--ivory)]">{currentTrack.title}</span>
              <span className={`block truncate text-[11px] ${error ? "text-gold-bright" : "text-[var(--muted-on-night)]"}`}>{error ? "تعذّر التشغيل — اضغط ↻" : loading ? "جارٍ التحميل…" : currentTrack.subtitle}</span>
            </span>
          </button>
          <button onClick={error ? retry : togglePlay} aria-label={error ? "إعادة المحاولة" : playing ? "إيقاف مؤقت" : "تشغيل"} className="pressable focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-bright to-gold text-[#1a1407]">
            {playing ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.2" /><rect x="13.5" y="5" width="4" height="14" rx="1.2" /></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
          </button>
          <button onClick={stop} aria-label="إغلاق المشغّل" className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--muted-on-night)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        {!currentTrack.live && <div className="h-[2px] bg-white/10" aria-hidden><div className="h-full bg-gold" style={{ width: `${pct}%`, transition: "width .5s linear" }} /></div>}
      </div>
      <FullScreenPlayer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
