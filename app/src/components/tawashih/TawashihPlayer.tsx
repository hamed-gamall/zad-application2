"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { TawashihTrack } from "@/lib/data";
import { useAudioPlayer, type AudioTrack } from "@/components/audio/AudioPlayerProvider";
import ArtMedallion from "@/components/ui/ArtMedallion";
import SceneArt from "@/components/ui/SceneArt";

// Long titles (some of the original recordings have very long, descriptive
// names) are shortened for display so cards stay tidy; the full title is
// still available as a tooltip and inside the mini player via title="".
const MAX_TITLE_LENGTH = 42;
function shortTitle(title: string) {
  if (title.length <= MAX_TITLE_LENGTH) return title;
  return `${title.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`;
}

export default function TawashihPlayer({
  reciterId,
  reciterName,
  tracks,
}: {
  reciterId: string;
  reciterName: string;
  tracks: TawashihTrack[];
}) {
  const [query, setQuery] = useState("");
  const { currentTrack, playing, playPlaylist, togglePlay } = useAudioPlayer();
  const searchParams = useSearchParams();

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return tracks;
    return tracks.filter((t) => t.title.includes(q));
  }, [tracks, query]);

  const playlist: AudioTrack[] = useMemo(
    () =>
      filtered.map((t) => ({
        id: `audio:tawashih:${reciterId}:${t.id}`,
        title: shortTitle(t.title),
        subtitle: reciterName,
        url: t.url,
        artwork: "/art/tawashih.png",
        favorite: {
          id: `audio:tawashih:${reciterId}:${t.id}`,
          type: "audio",
          label: `${reciterName} — ${t.title}`,
          href: `/tools/tawashih/${reciterId}?play=${t.id}`,
        },
      })),
    [filtered, reciterId, reciterName]
  );

  useEffect(() => {
    const requested = searchParams.get("play");
    if (!requested) return;
    const idx = playlist.findIndex((t) => t.id.endsWith(`:${requested}`));
    if (idx >= 0) playPlaylist(playlist, idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function play(id: string) {
    const idx = playlist.findIndex((t) => t.id.endsWith(`:${id}`));
    if (idx >= 0) playPlaylist(playlist, idx);
  }

  const inThis = !!currentTrack && playlist.some((t) => t.id === currentTrack.id);
  return (
    <div>
      <section className="force-dark relative isolate px-6 pb-8 pt-4 text-center">
        <SceneArt variant="mountains" moon={false} className="absolute inset-x-0 top-0 -z-10 h-[360px] opacity-90" />
        <ArtMedallion seed={"t" + reciterId} glyph="♪" className="mx-auto w-40 text-7xl ring-[3px] ring-[var(--gold)] ring-offset-4 ring-offset-[#061512] shadow-[0_30px_70px_-20px_rgba(0,0,0,.8)]" rounded="rounded-full" />
        <h1 className="font-display mt-5 text-4xl text-[var(--ivory)]">{reciterName}</h1>
        <p className="mt-1 text-sm text-[var(--muted-on-night)]">{tracks.length.toLocaleString("ar-EG")} {tracks.length === 1 ? "تسجيل" : "تسجيلًا"}</p>
        <button onClick={() => (inThis ? togglePlay() : playlist.length && playPlaylist(playlist, 0))} className="pressable focus-ring mx-auto mt-5 flex h-14 items-center gap-3 rounded-full bg-gradient-to-l from-gold-bright to-gold px-9 font-semibold text-[#1a1407] shadow-[0_14px_40px_-10px_rgba(200,164,90,.6)]">
          {inThis && playing ? "إيقاف مؤقت" : "تشغيل الكل"}
        </button>
      </section>
      <div className="px-6">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن تسجيل" className="field" aria-label="بحث عن تسجيل" />
        <ol className="mt-4">
          {filtered.map((t, i) => {
            const cur = currentTrack?.id === `audio:tawashih:${reciterId}:${t.id}`;
            return (
              <li key={t.id}>
                <button onClick={() => (cur ? togglePlay() : play(t.id))} title={t.title} className={`pressable focus-ring flex w-full items-center gap-4 rounded-2xl px-2 py-3 text-start ${cur ? "bg-gold/12" : "hover:bg-white/[0.04]"}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-sm tabular-nums text-[var(--muted-on-night)]">
                    {cur && playing ? <span className="flex h-4 items-end gap-[2px]" aria-hidden>{[0, 0.2, 0.1].map((d, k) => <span key={k} className="eq-bar h-4 !w-[3px]" style={{ animationDelay: `${d}s` }} />)}</span> : (i + 1).toLocaleString("ar-EG")}
                  </span>
                  <span className="min-w-0 flex-1"><span className={`block truncate text-[15px] ${cur ? "text-gold-bright" : "text-[var(--ivory)]"}`}>{shortTitle(t.title)}</span><span className="block text-xs text-[var(--muted-on-night)]">{t.duration}</span></span>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && <li className="py-12 text-center text-sm text-[var(--muted-on-night)]">لا توجد تسجيلات مطابقة.</li>}
        </ol>
      </div>
    </div>
  );
}
