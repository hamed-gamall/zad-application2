import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getTawashihList } from "@/lib/data";
import TawashihPlayer from "@/components/tawashih/TawashihPlayer";

export async function generateStaticParams() {
  try {
    const list = await getTawashihList();
    return list.map((r) => ({ id: r.id }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const list = await getTawashihList();
    const reciter = list.find((r) => r.id === id);
    return { title: reciter ? reciter.name : "التواشيح والابتهالات" };
  } catch {
    return { title: "التواشيح والابتهالات" };
  }
}

export default async function TawashihReciterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let reciter: Awaited<ReturnType<typeof getTawashihList>>[number] | null = null;

  try {
    const list = await getTawashihList();
    reciter = list.find((r) => r.id === id) ?? null;
  } catch {
    reciter = null;
  }

  if (!reciter) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="rounded-3xl bg-white/[0.05] p-6 text-center text-sm text-[var(--muted-on-night)]">تعذّر تحميل بيانات هذا المنشد. حاول تحديث الصفحة.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="px-6 pt-6">
        <Link href="/tools/tawashih" aria-label="رجوع" className="fcontrol focus-ring"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg></Link>
      </div>
      <Suspense fallback={null}>
        <TawashihPlayer reciterId={reciter.id} reciterName={reciter.name} tracks={reciter.tracks} />
      </Suspense>
    </div>
  );
}
