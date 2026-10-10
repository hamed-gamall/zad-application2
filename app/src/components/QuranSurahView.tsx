"use client";

import { useEffect, useState } from "react";
import type { SurahMeta, SurahText, TafsirSurah } from "@/lib/types";
import { getPrefs, setPrefs, type ReadingPrefs } from "@/lib/storage";
import QuranReader from "@/components/QuranReader";
import QuranPagesReader from "@/components/QuranPagesReader";

type TafsirId = "muyassar" | "saadi" | "e3rab" | "jalalayn" | "qurtubi" | "waseet" | "baghawi" | "tanwir";

// Two reading modes, one switch that lives inside each reader's own floating
// controls — there is no page-level toolbar any more.
export default function QuranSurahView({
  surahNumber,
  surahText,
  surahList,
  tafsirs,
  translation,
  initialPage,
}: {
  surahNumber: number;
  surahText: SurahText;
  surahList: SurahMeta[];
  tafsirs: Record<TafsirId, TafsirSurah | null>;
  translation: TafsirSurah | null;
  initialPage?: number;
}) {
  const [mode, setMode] = useState<ReadingPrefs["readingMode"]>("scroll");

  useEffect(() => {
    // A saved page bookmark always opens on its exact Mushaf page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(initialPage ? "pages" : getPrefs().readingMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchMode(m: ReadingPrefs["readingMode"]) {
    setPrefs({ readingMode: m });
    setMode(m);
  }

  const meta = surahList[surahNumber - 1];
  const startPage = initialPage ?? Number(meta.page || meta.pages || 1);

  return mode === "pages" ? (
    <QuranPagesReader key={startPage} initialPage={startPage} surahList={surahList} onSwitchMode={() => switchMode("scroll")} />
  ) : (
    <QuranReader surahNumber={surahNumber} surahText={surahText} surahList={surahList} tafsirs={tafsirs} translation={translation} onSwitchMode={() => switchMode("pages")} />
  );
}
