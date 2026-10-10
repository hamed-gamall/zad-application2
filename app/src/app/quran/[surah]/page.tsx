import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getSurahList,
  getSurahText,
  getTafsirForSurah,
  getTranslationForSurah,
} from "@/lib/data";
import QuranSurahView from "@/components/QuranSurahView";

export async function generateStaticParams() {
  return Array.from({ length: 114 }, (_, i) => ({ surah: String(i + 1) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ surah: string }>;
}): Promise<Metadata> {
  const { surah } = await params;
  const n = Number(surah);
  if (!Number.isInteger(n) || n < 1 || n > 114) return {};
  const list = await getSurahList();
  const meta = list[n - 1];
  return {
    title: `سورة ${meta.titleAr}`,
    description: `اقرأ سورة ${meta.titleAr} (${meta.titleEn}) كاملة مع التفسير والاستماع للتلاوة — ${meta.count} آية، ${meta.place === "Mecca" ? "مكية" : "مدنية"}.`,
  };
}

export default async function SurahPage({
  params,
  searchParams,
}: {
  params: Promise<{ surah: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { surah } = await params;
  const { page: pageParam } = await searchParams;
  const n = Number(surah);
  if (!Number.isInteger(n) || n < 1 || n > 114) notFound();

  const requestedPage = Number(pageParam);
  const initialPage = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : undefined;

  const [list, text, muyassar, saadi, e3rab, jalalayn, qurtubi, waseet, baghawi, tanwir, translation] = await Promise.all([
    getSurahList(),
    getSurahText(n),
    getTafsirForSurah("muyassar", n),
    getTafsirForSurah("saadi", n),
    getTafsirForSurah("e3rab", n),
    getTafsirForSurah("jalalayn", n),
    getTafsirForSurah("qurtubi", n),
    getTafsirForSurah("waseet", n),
    getTafsirForSurah("baghawi", n),
    getTafsirForSurah("tanwir", n),
    getTranslationForSurah(n),
  ]);

  return (
    <Suspense fallback={null}>
      <QuranSurahView
        surahNumber={n}
        surahText={text}
        surahList={list}
        tafsirs={{ muyassar, saadi, e3rab, jalalayn, qurtubi, waseet, baghawi, tanwir }}
        translation={translation}
        initialPage={initialPage}
      />
    </Suspense>
  );
}
