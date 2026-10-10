"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { MoshafInfo } from "@/lib/live";
import { surahAudioUrl } from "@/lib/live";
import { useAudioPlayer, type AudioTrack } from "./AudioPlayerProvider";
import ArtMedallion from "@/components/ui/ArtMedallion";
import SceneArt from "@/components/ui/SceneArt";

interface SurahLite { number: number; name: string }
const ar = (n: number) => n.toLocaleString("ar-EG");

// A reciter's profile: large emblem, one "play all" button, riwaya chips and
// the surah list as a continuous track list.
export default function ReciterPlayer({ reciterId, reciterName, moshaf, surahs }: { reciterId: number; reciterName: string; moshaf: MoshafInfo[]; surahs: SurahLite[] }) {
  const [activeMoshaf, setActiveMoshaf] = useState(moshaf[0]);
  const [query, setQuery] = useState("");
  const { currentTrack, playing, playPlaylist, togglePlay } = useAudioPlayer();
  const searchParams = useSearchParams();

  const availableSurahs = useMemo(() => {
    const allowed = new Set(activeMoshaf.surah_list.split(",").map((n) => Number(n.trim())).filter(Boolean));
    return surahs.filter((s) => allowed.has(s.number));
  }, [activeMoshaf, surahs]);

  const filtered = useMemo(() => {
    const q = query.trim();
    return q ? availableSurahs.filter((s) => s.name.includes(q) || String(s.number) === q) : availableSurahs;
  }, [availableSurahs, query]);

  const playlist: AudioTrack[] = useMemo(
    () =>
      availableSurahs.map((s) => ({
        id: `audio:${reciterId}:${activeMoshaf.id}:${s.number}`,
        title: s.name,
        subtitle: `${reciterName} · ${activeMoshaf.name}`,
        url: surahAudioUrl(activeMoshaf.server, s.number),
        artwork: "/art/quran.png",
        favorite: { id: `audio:${reciterId}:${activeMoshaf.id}:${s.number}`, type: "audio", label: `${reciterName} — ${s.name} (${activeMoshaf.name})`, href: `/reciters/${reciterId}?play=${s.number}` },
      })),
    [availableSurahs, reciterId, reciterName, activeMoshaf]
  );

  useEffect(() => {
    const requested = Number(searchParams.get("play"));
    if (!requested) return;
    const idx = playlist.findIndex((t) => t.id.endsWith(`:${requested}`));
    if (idx >= 0) playPlaylist(playlist, idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = (num: number) => {
    const idx = playlist.findIndex((t) => t.id.endsWith(`:${num}`));
    if (idx >= 0) playPlaylist(playlist, idx);
  };
  const inThis = !!currentTrack && playlist.some((t) => t.id === currentTrack.id);

  return (
    <div>
      <section className="force-dark relative isolate px-6 pb-8 pt-4 text-center">
        <SceneArt variant="mountains" moon={false} className="absolute inset-x-0 top-0 -z-10 h-[360px] opacity-90" />
        <ArtMedallion seed={String(reciterId)} glyph={reciterName.trim().charAt(0)} className="mx-auto w-40 text-7xl ring-[3px] ring-[var(--gold)] ring-offset-4 ring-offset-[#061512] shadow-[0_30px_70px_-20px_rgba(0,0,0,.8)]" rounded="rounded-full" />
        <h1 className="font-display mt-5 text-4xl text-[var(--ivory)]">{reciterName}</h1>
        <p className="mt-1 text-sm text-[var(--muted-on-night)]">{ar(availableSurahs.length)} سورة · {activeMoshaf.name}</p>
        <button onClick={() => (inThis ? togglePlay() : playPlaylist(playlist, 0))} className="pressable focus-ring mx-auto mt-5 flex h-14 items-center gap-3 rounded-full bg-gradient-to-l from-gold-bright to-gold px-9 font-semibold text-[#1a1407] shadow-[0_14px_40px_-10px_rgba(200,164,90,.6)]">
          {inThis && playing ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.2" /><rect x="13.5" y="5" width="4" height="14" rx="1.2" /></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
          {inThis && playing ? "إيقاف مؤقت" : "تشغيل الكل"}
        </button>
      </section>

      {moshaf.length > 1 && (
        <div className="h-scroll mb-4" role="group" aria-label="الرواية">
          {moshaf.map((m) => <button key={m.id} aria-pressed={activeMoshaf.id === m.id} onClick={() => setActiveMoshaf(m)} className="chip focus-ring">{m.name}</button>)}
        </div>
      )}
      <div className="px-6">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن سورة" className="field" aria-label="بحث عن سورة" />
        <ol className="mt-4">
          {filtered.map((s) => {
            const cur = currentTrack?.id === `audio:${reciterId}:${activeMoshaf.id}:${s.number}`;
            return (
              <li key={s.number}>
                <button onClick={() => (cur ? togglePlay() : play(s.number))} className={`pressable focus-ring flex w-full items-center gap-4 rounded-2xl px-2 py-3 text-start ${cur ? "bg-gold/12" : "hover:bg-white/[0.04]"}`}>
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-sm tabular-nums text-[var(--muted-on-night)]">
                    {cur && playing ? <span className="flex h-4 items-end gap-[2px]" aria-hidden>{[0, 0.2, 0.1].map((d, i) => <span key={i} className="eq-bar h-4 !w-[3px]" style={{ animationDelay: `${d}s` }} />)}</span> : cur ? <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--gold-bright)"><path d="M8 5v14l11-7z" /></svg> : ar(s.number)}
                  </span>
                  <span className={`font-display flex-1 text-xl ${cur ? "text-gold-bright" : "text-[var(--ivory)]"}`}>{s.name}</span>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && <li className="py-12 text-center text-sm text-[var(--muted-on-night)]">لا توجد سور مطابقة في هذه الرواية.</li>}
        </ol>
      </div>
    </div>
  );
}
