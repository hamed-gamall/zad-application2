"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SurahMeta, SurahText, TafsirSurah } from "@/lib/types";
import { fetchReciters, surahAudioUrl, type ReciterInfo } from "@/lib/live";
import { AYAH_AUDIO_RECITERS, ayahAudioUrl } from "@/lib/ayahAudio";
import { getPrefs, DEFAULT_PREFS, setPrefs, isBookmarked, toggleBookmark, setProgress, type ReadingPrefs } from "@/lib/storage";
import CopyShareBar from "@/components/CopyShareBar";
import ImmersiveScreen from "@/components/ui/ImmersiveScreen";
import FloatingControl from "@/components/ui/FloatingControl";
import BottomSheet from "@/components/ui/BottomSheet";
import SurahBanner from "@/components/ui/SurahBanner";
import SurahPickerSheet from "@/components/ui/SurahPickerSheet";
import ReciterPickerSheet from "@/components/ui/ReciterPickerSheet";

type TafsirId = "muyassar" | "saadi" | "e3rab" | "jalalayn" | "qurtubi" | "waseet" | "baghawi" | "tanwir";
const TAFSIR_LABELS: Record<TafsirId, string> = {
  muyassar: "الميسّر", saadi: "السعدي", e3rab: "الإعراب", jalalayn: "الجلالين",
  qurtubi: "القرطبي", waseet: "الوسيط", baghawi: "البغوي", tanwir: "ابن عباس",
};
const ico = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const ar = (n: number) => n.toLocaleString("ar-EG");

type Sheet = null | "tafsir" | "translation" | "share" | "settings" | "surahs" | "reciter";

// A digital Mushaf: ayahs flow together as one justified composition, with
// round verse markers. Each ayah is tappable; a small action layer appears
// beside it and disappears when you tap away.
export default function QuranReader({
  surahNumber, surahText, surahList, tafsirs, translation, onSwitchMode,
}: {
  surahNumber: number;
  surahText: SurahText;
  surahList: SurahMeta[];
  tafsirs: Record<TafsirId, TafsirSurah | null>;
  translation: TafsirSurah | null;
  onSwitchMode?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightAyah = Number(searchParams.get("ayah")) || null;

  const [prefs, setPrefsState] = useState<ReadingPrefs>(DEFAULT_PREFS);
  const [selected, setSelected] = useState<number | null>(highlightAyah);
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [reciters, setReciters] = useState<ReciterInfo[] | null>(null);
  const [reciterLoading, setReciterLoading] = useState(false);
  const [reciterNotice, setReciterNotice] = useState<string | null>(null);
  const [bmVersion, setBmVersion] = useState(0);
  const [autoScroll, setAutoScroll] = useState(false);
  const [speed, setSpeed] = useState(3);
  const [playing, setPlaying] = useState<{ label: string } | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const meta = surahList[surahNumber - 1];
  const tafsirData = prefs.tafsirId !== "none" ? tafsirs[prefs.tafsirId] : null;
  const verses = useMemo(() => surahText.verses.filter((v) => v.ayah !== 0), [surahText]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefsState(getPrefs());
  }, []);
  // Reading progress is saved only after a real interaction — tapping an ayah
  // or scrolling into the text — never just because a surah was opened.
  useEffect(() => {
    if (selected !== null) setProgress({ surah: surahNumber, ayah: selected, updatedAt: Date.now() });
  }, [surahNumber, selected]);
  useEffect(() => {
    const s = document.querySelector<HTMLElement>(".immersive-scroll");
    if (!s) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const on = () => {
      if (s.scrollTop < 240) return;
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        const top = s.getBoundingClientRect().top + 120;
        const el = Array.from(s.querySelectorAll<HTMLElement>("[data-ayah]")).find((e) => e.getBoundingClientRect().bottom > top);
        const n = Number(el?.dataset.ayah);
        if (n) setProgress({ surah: surahNumber, ayah: n, updatedAt: Date.now() });
      }, 700);
    };
    s.addEventListener("scroll", on, { passive: true });
    return () => {
      s.removeEventListener("scroll", on);
      if (t) clearTimeout(t);
    };
  }, [surahNumber]);

  const scroller = () => document.querySelector<HTMLElement>(".immersive-scroll");

  const placeMenu = useCallback((ayah: number | null) => {
    if (ayah === null) return setMenu(null);
    const el = document.getElementById(`ayah-${ayah}`);
    const rects = el?.getClientRects();
    if (!el || !rects || !rects.length) return setMenu(null);
    const r = rects[0];
    const W = 310;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - W / 2), window.innerWidth - W - 8);
    const above = r.top - 62;
    setMenu({ left, top: above > 80 ? above : rects[rects.length - 1].bottom + 8 });
  }, []);

  useEffect(() => {
    if (!highlightAyah) return;
    document.getElementById(`ayah-${highlightAyah}`)?.scrollIntoView({ block: "center" });
    const t = setTimeout(() => placeMenu(highlightAyah), 400);
    return () => clearTimeout(t);
  }, [highlightAyah, surahNumber, placeMenu]);

  useEffect(() => {
    const s = scroller();
    if (!s || selected === null) return;
    const on = () => placeMenu(selected);
    s.addEventListener("scroll", on, { passive: true });
    return () => s.removeEventListener("scroll", on);
  }, [selected, placeMenu]);

  useEffect(() => {
    if (!autoScroll) return;
    const id = setInterval(() => scroller()?.scrollBy({ top: speed, behavior: "auto" }), 40);
    return () => clearInterval(id);
  }, [autoScroll, speed]);

  useEffect(() => () => { audio.current?.pause(); }, []);

  function updatePrefs(p: Partial<ReadingPrefs>) {
    setPrefs(p);
    setPrefsState(getPrefs());
  }
  function select(ayah: number) {
    const next = selected === ayah ? null : ayah;
    setSelected(next);
    placeMenu(next);
  }
  function clear() {
    setSelected(null);
    setMenu(null);
  }
  function play(src: string, label: string) {
    audio.current?.pause();
    const a = new Audio(src);
    audio.current = a;
    a.onended = () => setPlaying(null);
    a.onerror = () => setPlaying(null);
    a.play().then(() => setPlaying({ label })).catch(() => setPlaying(null));
  }
  function stop() {
    audio.current?.pause();
    setPlaying(null);
  }
  async function openReciters() {
    setSheet("reciter");
    if (reciters || reciterLoading) return;
    setReciterLoading(true);
    try { setReciters(await fetchReciters()); } catch { setReciters([]); } finally { setReciterLoading(false); }
  }
  function pickReciter(r: ReciterInfo) {
    const m = r.moshaf.find((x) => x.surah_list.split(",").map((n) => Number(n.trim())).includes(surahNumber));
    if (!m) return setReciterNotice("هذا القارئ لا يقرأ هذه السورة، اختر قارئًا آخر.");
    setReciterNotice(null);
    updatePrefs({ reciterServer: m.server, reciterName: r.name });
    setSheet(null);
    play(surahAudioUrl(m.server, surahNumber), `${r.name} · ${meta.titleAr}`);
  }

  const sel = verses.find((v) => v.ayah === selected) ?? null;
  const selTafsir = sel && tafsirData?.verses.find((t) => t.ayah === sel.ayah);
  const selTrans = sel && translation?.verses.find((t) => t.ayah === sel.ayah);
  const saved = sel ? isBookmarked(surahNumber, sel.ayah) : false;
  void bmVersion;

  return (
    <ImmersiveScreen
      scroll
      backHref="/quran"
      title={`سورة ${meta.titleAr}`}
      subtitle={`${meta.place === "Mecca" ? "مكية" : "مدنية"} · ${ar(meta.count)} آية`}
      top={
        <>
          {onSwitchMode && (
            <FloatingControl label="صفحات المصحف" onClick={onSwitchMode}>
              <svg {...ico}><rect x="5" y="3.5" width="14" height="17" rx="1.5" /><path d="M9 8h6M9 12h6" /></svg>
            </FloatingControl>
          )}
          <FloatingControl label="الإعدادات" onClick={() => setSheet("settings")}>
            <svg {...ico}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>
          </FloatingControl>
        </>
      }
      bottom={
        <>
          <FloatingControl label="سورة سابقة" onClick={() => surahNumber > 1 && router.push(`/quran/${surahNumber - 1}`)}>
            <svg {...ico}><path d="m9 6 6 6-6 6" /></svg>
          </FloatingControl>
          <FloatingControl label="الانتقال إلى سورة" onClick={() => setSheet("surahs")}>
            <span className="font-display text-base">{meta.titleAr}</span>
          </FloatingControl>
          <FloatingControl label="تلاوة السورة" active={!!playing} onClick={() => (playing ? stop() : prefs.reciterServer ? play(surahAudioUrl(prefs.reciterServer, surahNumber), `${prefs.reciterName ?? ""} · ${meta.titleAr}`) : openReciters())}>
            {playing ? <svg {...ico} fill="currentColor"><rect x="7" y="5" width="3.5" height="14" rx="1" /><rect x="13.5" y="5" width="3.5" height="14" rx="1" /></svg> : <svg {...ico} fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
          </FloatingControl>
          <FloatingControl label="سورة تالية" onClick={() => surahNumber < 114 && router.push(`/quran/${surahNumber + 1}`)}>
            <svg {...ico}><path d="m15 6-6 6 6 6" /></svg>
          </FloatingControl>
        </>
      }
    >
      <div className="mx-auto max-w-[640px] px-6" onClick={(e) => { if (!(e.target as HTMLElement).closest("[data-ayah]")) clear(); }}>
        <SurahBanner name={`سورة ${meta.titleAr}`} meta={`${ar(meta.count)} آية · ${meta.place === "Mecca" ? "مكية" : "مدنية"}`} />
        {surahNumber !== 9 && surahNumber !== 1 && (
          <p className="font-quran my-6 text-center text-3xl text-gold-bright">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
        )}
        <div className="font-quran text-justify text-[var(--ivory)]" style={{ fontSize: prefs.fontSize, lineHeight: 2.35 }} dir="rtl" lang="ar">
          {verses.map((v) => (
            <span key={v.ayah}>
              <span id={`ayah-${v.ayah}`} data-ayah={v.ayah} className="ayah" data-selected={selected === v.ayah} role="button" tabIndex={0} aria-label={`الآية ${v.ayah}`} onClick={() => select(v.ayah)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && select(v.ayah)}>
                {v.text}{" "}
                <span className="ayah-mark">{ar(v.ayah)}</span>
              </span>{" "}
            </span>
          ))}
        </div>
        <p className="font-display mt-14 text-center text-lg text-[var(--muted-on-night)]">صدق الله العظيم</p>
      </div>

      {menu && sel && (
        <div className="ayah-menu glass" style={{ top: menu.top, left: menu.left }} role="toolbar" aria-label={`إجراءات الآية ${sel.ayah}`}>
          <button onClick={() => play(ayahAudioUrl(prefs.ayahReciterEdition, surahNumber, sel.ayah), `الآية ${ar(sel.ayah)}`)} aria-label="تشغيل الآية"><svg {...ico} width={18} height={18} fill="currentColor"><path d="M8 5v14l11-7z" /></svg>تشغيل</button>
          <button onClick={() => setSheet("tafsir")} aria-label="التفسير"><svg {...ico} width={18} height={18}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M9 9h6" /></svg>تفسير</button>
          <button onClick={() => setSheet("translation")} aria-label="الترجمة"><svg {...ico} width={18} height={18}><path d="M4 5h9M8.5 3v2M6 5c1 4 3 6 6 7M12 5c-1 4-3.5 6.5-7 8M13 20l4-9 4 9M14.5 17h5" /></svg>ترجمة</button>
          <button onClick={() => navigator.clipboard?.writeText(`${sel.text} — سورة ${meta.titleAr}: ${sel.ayah}`).catch(() => {})} aria-label="نسخ"><svg {...ico} width={18} height={18}><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h8" /></svg>نسخ</button>
          <button onClick={() => setSheet("share")} aria-label="مشاركة"><svg {...ico} width={18} height={18}><circle cx="6" cy="12" r="2.2" /><circle cx="17" cy="6" r="2.2" /><circle cx="17" cy="18" r="2.2" /><path d="m8 11 7-4M8 13l7 4" /></svg>شارك</button>
          <button aria-pressed={saved} onClick={() => { toggleBookmark({ surah: surahNumber, ayah: sel.ayah, surahName: meta.titleAr, savedAt: Date.now() }); setBmVersion((n) => n + 1); }} aria-label="حفظ الموضع"><svg {...ico} width={18} height={18} fill={saved ? "currentColor" : "none"}><path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" /></svg>حفظ</button>
        </div>
      )}

      {playing && (
        <button onClick={stop} className="glass pressable focus-ring absolute inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-10 mx-auto flex items-center gap-3 rounded-full py-2 pe-4 ps-3" style={{ width: "fit-content", maxWidth: "90%" }} aria-label="إيقاف التشغيل">
          <span className="flex h-5 items-end gap-[3px]" aria-hidden>{[0, 0.2, 0.4, 0.1].map((d, i) => <span key={i} className="eq-bar h-5" style={{ animationDelay: `${d}s` }} />)}</span>
          <span className="truncate text-sm text-[var(--ivory)]">{playing.label}</span>
        </button>
      )}

      {/* Tafsir — the ayah stays visible above the explanation */}
      <BottomSheet open={sheet === "tafsir" && !!sel} onClose={() => setSheet(null)} title={`تفسير الآية ${sel ? ar(sel.ayah) : ""}`}>
        {sel && <p className="font-quran mb-4 rounded-2xl bg-gold/10 px-4 py-3 text-xl leading-[2.1] text-[var(--ivory)]" dir="rtl">{sel.text}</p>}
        <div className="h-scroll -mx-5 mb-4 !px-5" role="group" aria-label="مصدر التفسير">
          {(Object.keys(TAFSIR_LABELS) as TafsirId[]).map((id) => (
            <button key={id} aria-pressed={prefs.tafsirId === id} onClick={() => updatePrefs({ tafsirId: id })} className="chip focus-ring">{TAFSIR_LABELS[id]}</button>
          ))}
        </div>
        {prefs.tafsirId === "none" ? <p className="text-sm text-[var(--muted-on-night)]">اختر مصدر التفسير من الأعلى.</p>
          : selTafsir ? <p className="text-[17px] leading-[2.1] text-[var(--text-on-night)]">{selTafsir.text}</p>
          : <p className="text-sm text-[var(--muted-on-night)]">لا يتوفر تفسير لهذه الآية في هذا المصدر.</p>}
      </BottomSheet>

      <BottomSheet open={sheet === "translation" && !!sel} onClose={() => setSheet(null)} title="الترجمة">
        {sel && <p className="font-quran mb-4 rounded-2xl bg-gold/10 px-4 py-3 text-xl leading-[2.1] text-[var(--ivory)]" dir="rtl">{sel.text}</p>}
        <p className="mb-1 text-xs text-[var(--muted-on-night)]">Sahih International</p>
        <p className="text-lg leading-8 text-[var(--text-on-night)]" dir="ltr">{selTrans ? selTrans.text : "Translation unavailable for this verse."}</p>
      </BottomSheet>

      <BottomSheet open={sheet === "share" && !!sel} onClose={() => setSheet(null)} title="مشاركة الآية">
        {sel && <CopyShareBar text={`${sel.text} — سورة ${meta.titleAr}: ${sel.ayah}`} shareTitle={`سورة ${meta.titleAr} - الآية ${sel.ayah}`} />}
      </BottomSheet>

      <BottomSheet open={sheet === "settings"} onClose={() => setSheet(null)} title="خيارات القراءة">
        <div className="space-y-6">
          <label className="block">
            <span className="mb-2 flex justify-between text-sm text-[var(--muted-on-night)]"><span>حجم الخط</span><span className="tabular-nums">{prefs.fontSize}</span></span>
            <input type="range" min={20} max={48} value={prefs.fontSize} onChange={(e) => updatePrefs({ fontSize: Number(e.target.value) })} className="w-full accent-[var(--gold)]" />
          </label>
          <div>
            <p className="mb-2 text-sm text-[var(--muted-on-night)]">التفسير</p>
            <div className="h-scroll -mx-5 !px-5">
              <button aria-pressed={prefs.tafsirId === "none"} onClick={() => updatePrefs({ tafsirId: "none" })} className="chip focus-ring">بدون</button>
              {(Object.keys(TAFSIR_LABELS) as TafsirId[]).map((id) => <button key={id} aria-pressed={prefs.tafsirId === id} onClick={() => updatePrefs({ tafsirId: id })} className="chip focus-ring">{TAFSIR_LABELS[id]}</button>)}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm text-[var(--muted-on-night)]">قارئ الآية المفردة</p>
            <select value={prefs.ayahReciterEdition} onChange={(e) => updatePrefs({ ayahReciterEdition: e.target.value })} className="field" aria-label="قارئ الآية">
              {AYAH_AUDIO_RECITERS.map((r) => <option key={r.id} value={r.folder}>{r.name}</option>)}
            </select>
          </div>
          <button onClick={openReciters} className="pressable focus-ring flex w-full items-center justify-between rounded-2xl bg-white/[0.05] px-4 py-3.5 text-start"><span>قارئ السورة</span><span className="text-gold-bright">{prefs.reciterName ?? "اختر"}</span></button>
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.05] px-4 py-3.5">
            <span>تمرير تلقائي</span>
            <button role="switch" aria-checked={autoScroll} aria-label="تمرير تلقائي" onClick={() => setAutoScroll((a) => !a)} className={`focus-ring h-7 w-12 rounded-full p-0.5 transition-colors ${autoScroll ? "bg-gold" : "bg-white/15"}`}><span className={`block h-6 w-6 rounded-full bg-white transition-transform ${autoScroll ? "-translate-x-5" : ""}`} /></button>
          </div>
          {autoScroll && <input type="range" min={1} max={10} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full accent-[var(--gold)]" aria-label="سرعة التمرير" />}
        </div>
      </BottomSheet>

      <SurahPickerSheet open={sheet === "surahs"} onClose={() => setSheet(null)} surahList={surahList} current={surahNumber} onPick={(n) => router.push(`/quran/${n}`)} />
      <ReciterPickerSheet open={sheet === "reciter"} onClose={() => setSheet(null)} reciters={reciters} loading={reciterLoading} notice={reciterNotice} currentName={prefs.reciterName} onPick={pickReciter} />
    </ImmersiveScreen>
  );
}
