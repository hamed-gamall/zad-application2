import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { fetchReciters } from "@/lib/live";
import { getSurahList } from "@/lib/data";
import ReciterPlayer from "@/components/audio/ReciterPlayer";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const reciters = await fetchReciters();
    const reciter = reciters.find((r) => r.id === Number(id));
    return { title: reciter ? reciter.name : "المكتبة الصوتية" };
  } catch {
    return { title: "المكتبة الصوتية" };
  }
}

export default async function ReciterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let data: {
    reciter: Awaited<ReturnType<typeof fetchReciters>>[number];
    surahs: { number: number; name: string }[];
  } | null = null;

  try {
    const [reciters, surahList] = await Promise.all([fetchReciters(), getSurahList()]);
    const reciter = reciters.find((r) => r.id === Number(id));
    if (reciter) {
      data = {
        reciter,
        surahs: surahList.map((s, i) => ({ number: i + 1, name: s.titleAr })),
      };
    }
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="rounded-3xl bg-white/[0.05] p-6 text-center text-sm text-[var(--muted-on-night)]">تعذّر تحميل بيانات هذا القارئ. حاول تحديث الصفحة.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="px-6 pt-6">
        <Link href="/reciters" aria-label="رجوع" className="fcontrol focus-ring"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg></Link>
      </div>
      <Suspense fallback={null}>
        <ReciterPlayer reciterId={data.reciter.id} reciterName={data.reciter.name} moshaf={data.reciter.moshaf} surahs={data.surahs} />
      </Suspense>
    </div>
  );
}
