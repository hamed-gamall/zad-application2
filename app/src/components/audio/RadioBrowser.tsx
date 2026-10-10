"use client";

import { useEffect, useState } from "react";
import { fetchRadioStations, fetchFreshRadioStreamUrl, type RadioStation } from "@/lib/live";
import { getFavorites, toggleFavorite } from "@/lib/storage";
import { useAudioPlayer } from "./AudioPlayerProvider";
import ArtMedallion from "@/components/ui/ArtMedallion";
import SceneArt from "@/components/ui/SceneArt";

function favId(station: RadioStation) {
  return `radio:${station.id}`;
}
function trackId(station: RadioStation) {
  return `radio-track:${station.id}`;
}

export default function RadioBrowser() {
  const [stations, setStations] = useState<RadioStation[] | null>(null);
  const [listError, setListError] = useState(false);
  const [query, setQuery] = useState("");
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const { currentTrack, playing, loading, error, playPlaylist, retry } = useAudioPlayer();

  useEffect(() => {
    fetchRadioStations()
      .then(setStations)
      .catch(() => setListError(true));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavIds(new Set(getFavorites().filter((f) => f.type === "radio").map((f) => f.id)));
  }, []);

  function play(station: RadioStation) {
    // Live streams don't have a "next" — each is its own single-track playlist.
    playPlaylist(
      [
        {
          id: trackId(station),
          title: station.name,
          subtitle: "بث مباشر",
          url: station.url,
          artwork: station.img ?? "/art/radio.png",
          live: true,
          nativePlayback: station.nativePlayback,
          // Lets the player recover from an expired signed stream URL by
          // fetching this exact station's freshest URL instead of retrying
          // the one it just failed with (see fetchFreshRadioStreamUrl).
          refreshUrl: () => fetchFreshRadioStreamUrl(station.id),
          favorite: {
            id: favId(station),
            type: "radio",
            label: station.name,
            href: "/tools/radio",
          },
        },
      ],
      0
    );
  }

  function toggleFav(station: RadioStation) {
    const id = favId(station);
     
    const savedAt = Date.now();
    toggleFavorite({ id, type: "radio", label: station.name, text: "", savedAt, href: "/tools/radio" });
    setFavIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = stations?.filter((s) => s.name.includes(query.trim())) ?? [];

  if (listError) {
    return <p className="mx-6 rounded-3xl bg-white/[0.05] p-6 text-center text-sm text-gold-bright">تعذّر جلب قائمة الإذاعات الآن. حاول مرة أخرى لاحقًا.</p>;
  }

  return (
    <div>
      <div className="force-dark relative isolate mx-6 mb-5 flex h-40 items-end overflow-hidden rounded-[28px] p-5">
        <SceneArt variant="dusk" className="absolute inset-0 -z-10 !mask-none" />
        <div>
          <p className="text-xs text-gold-bright">بث مباشر على مدار الساعة</p>
          <p className="font-display text-3xl text-[var(--ivory)]">إذاعات القرآن الكريم</p>
        </div>
      </div>
      <div className="px-6">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن إذاعة" className="field" aria-label="بحث عن إذاعة" />
      </div>
      {!stations && <p className="animate-pulse py-14 text-center text-sm text-[var(--muted-on-night)]">جارٍ تحميل الإذاعات…</p>}
      <ul className="mt-4 px-6">
        {filtered.map((s) => {
          const isCurrent = currentTrack?.id === trackId(s);
          const isFav = favIds.has(favId(s));
          const live = isCurrent && playing;
          return (
            <li key={s.id} className={`flex items-center gap-3 rounded-3xl px-2 py-2.5 ${isCurrent ? "bg-gold/10" : ""}`}>
              <button onClick={() => (isCurrent && error ? retry() : play(s))} className="pressable focus-ring flex min-w-0 flex-1 items-center gap-4 rounded-2xl text-start" aria-label={`${live ? "إيقاف" : "تشغيل"} ${s.name}`}>
                <span className="relative shrink-0">
                  {s.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.img} alt="" className="h-14 w-14 rounded-2xl bg-[#0b2a22] object-cover" onError={(e) => ((e.currentTarget.style.display = "none"))} />
                  ) : (
                    <ArtMedallion seed={s.name} glyph="◉" className="w-14 text-2xl" rounded="rounded-2xl" />
                  )}
                  {live && <span className="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full bg-gold"><span className="flex h-3 items-end gap-[1.5px]" aria-hidden>{[0, 0.2, 0.1].map((d, k) => <span key={k} className="eq-bar h-3 !w-[2px] !bg-[#1a1407]" style={{ animationDelay: `${d}s` }} />)}</span></span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`font-display block truncate text-xl ${isCurrent ? "text-gold-bright" : "text-[var(--ivory)]"}`}>{s.name}</span>
                  <span className={`block text-xs ${isCurrent && error ? "text-gold-bright" : "text-[var(--muted-on-night)]"}`}>
                    {isCurrent ? (error ? "تعذّر الاتصال — اضغط للمحاولة" : loading && !playing ? "جارٍ الاتصال…" : playing ? "يُبث الآن" : "متوقف") : "بث مباشر"}
                  </span>
                </span>
              </button>
              <button onClick={() => toggleFav(s)} aria-pressed={isFav} aria-label={isFav ? "إزالة من المفضلة" : "أضف إلى المفضلة"} className={`fcontrol focus-ring ${isFav ? "fcontrol-on" : ""}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.35-9.5-8.5C1 9 2.5 5.5 6 5c2-.3 3.7.7 6 3 2.3-2.3 4-3.3 6-3 3.5.5 5 4 3.5 7.5C19 16.65 12 21 12 21z" /></svg>
              </button>
            </li>
          );
        })}
        {stations && filtered.length === 0 && <li className="py-14 text-center text-sm text-[var(--muted-on-night)]">لا توجد إذاعات مطابقة.</li>}
      </ul>
    </div>
  );
}
