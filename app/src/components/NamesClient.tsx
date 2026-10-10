"use client";

import { useRef, useState } from "react";
import Ornament from "@/components/ui/Ornament";
import BottomSheet from "@/components/ui/BottomSheet";

interface N { number: number; translation: string; meaning: string; audio?: string }
const ar = (n: number) => n.toLocaleString("ar-EG");

// The 99 names: each is a tall, quiet page. Tap a row to open the name with
// its meaning and audio; the prophet's names follow as flowing text.
export default function NamesClient({ allah, prophet }: { allah: N[]; prophet: string[] }) {
  const [open, setOpen] = useState<N | null>(null);
  const [q, setQ] = useState("");
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const list = q.trim() ? allah.filter((n) => n.translation.includes(q.trim()) || n.meaning.includes(q.trim()) || String(n.number) === q.trim()) : allah;

  function play(n: N) {
    if (!n.audio) return;
    audio.current?.pause();
    const a = new Audio(n.audio);
    audio.current = a;
    a.onended = () => setPlaying(false);
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }
  function close() {
    audio.current?.pause();
    setPlaying(false);
    setOpen(null);
  }

  return (
    <div>
      <div className="px-6"><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في الأسماء ومعانيها" className="field" aria-label="بحث" /></div>
      <ul className="mt-5 grid grid-cols-3 gap-2 px-6">
        {list.map((n) => (
          <li key={n.number}>
            <button onClick={() => setOpen(n)} className="pressable focus-ring relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-3xl bg-white/[0.04] px-1 text-center hover:bg-white/[0.07]">
              <span aria-hidden className="absolute start-2 top-1.5 text-[10px] tabular-nums text-gold/70">{ar(n.number)}</span>
              <span className="font-display text-xl leading-tight text-gold-bright">{n.translation}</span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="col-span-3 py-14 text-center text-sm text-[var(--muted-on-night)]">لا توجد نتائج.</li>}
      </ul>

      <section className="mt-14 px-6" aria-label="أسماء النبي">
        <Ornament />
        <h2 className="font-display mt-6 text-center text-3xl text-[var(--ivory)]">أسماء وأوصاف النبي ﷺ</h2>
        <p className="mt-1 text-center text-xs text-[var(--muted-on-night)]">{ar(prophet.length)} اسمًا ووصفًا</p>
        <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-3">
          {prophet.map((n, i) => <li key={i} className="font-quran text-2xl text-[var(--ivory)]/90">{n}</li>)}
        </ul>
      </section>

      <BottomSheet open={!!open} onClose={close} title={open ? `الاسم ${ar(open.number)} من ٩٩` : undefined}>
        {open && (
          <div className="py-4 text-center">
            <p className="font-display text-7xl leading-tight text-gold-bright">{open.translation}</p>
            <Ornament className="my-5" />
            <p className="text-lg leading-9 text-[var(--text-on-night)]">{open.meaning}</p>
            {open.audio && (
              <button onClick={() => play(open)} className="pressable focus-ring mx-auto mt-6 flex h-12 items-center gap-2 rounded-full bg-gradient-to-l from-gold-bright to-gold px-7 font-semibold text-[#1a1407]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>{playing ? "يُستمع…" : "استمع"}
              </button>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
