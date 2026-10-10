import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getHadithIndex, getHadithByNumber } from "@/lib/data";
import { ChevronRightIcon, ChevronLeftIcon } from "@/components/icons/Icons";
import ScreenHeader from "@/components/ui/ScreenHeader";
import Ornament from "@/components/ui/Ornament";
import ArchFrame from "@/components/ui/ArchFrame";
import HadithActions from "@/components/hadith/HadithActions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ book: string; number: string }>;
}): Promise<Metadata> {
  const { book, number } = await params;
  const result = await getHadithByNumber(book, Number(number));
  if (!result) return {};
  return {
    title: `حديث رقم ${result.item.number} — ${result.page.bookNameArabic}`,
    description: result.item.text.slice(0, 150),
  };
}

export default async function HadithDetailPage({
  params,
}: {
  params: Promise<{ book: string; number: string }>;
}) {
  const { book, number } = await params;
  const n = Number(number);
  const { books } = await getHadithIndex();
  const info = books.find((b) => b.slug === book);
  if (!info) notFound();

  const result = await getHadithByNumber(book, n);
  if (!result) notFound();
  const { item } = result;

  const prevId = n > 1 ? n - 1 : null;
  const nextId = n < info.total ? n + 1 : null;

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title={info.nameArabic} subtitle={`حديث رقم ${item.number.toLocaleString("ar-EG")}`} backHref={`/hadith/${book}`} />
      <div className="px-5 pb-6 pt-2">
        <ArchFrame>
          <article>
            <p className="mb-4 text-center text-xs text-gold-bright">{info.nameArabic} · حديث رقم {item.number.toLocaleString("ar-EG")}</p>
            <p className="text-center text-[21px] leading-[2.3] text-[var(--ivory)]">{item.text}</p>
            <Ornament className="mt-8" />
            <div className="mt-6 flex justify-center"><HadithActions book={book} bookName={info.nameArabic} number={item.number} text={item.text} /></div>
          </article>
        </ArchFrame>
      </div>
      <div className="flex items-center justify-between px-6 pb-4">
        {prevId ? <Link href={`/hadith/${book}/${prevId}`} className="fcontrol focus-ring"><ChevronRightIcon size={16} /> السابق</Link> : <span />}
        {nextId ? <Link href={`/hadith/${book}/${nextId}`} className="fcontrol focus-ring">التالي <ChevronLeftIcon size={16} /></Link> : <span />}
      </div>
    </div>
  );
}
