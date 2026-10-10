import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getHadithIndex, getHadithPage } from "@/lib/data";
import ScreenHeader from "@/components/ui/ScreenHeader";
import HadithSearchBox from "@/components/hadith/HadithSearchBox";
import Pagination from "@/components/Pagination";
import CopyShareBar from "@/components/CopyShareBar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ book: string }>;
}): Promise<Metadata> {
  const { book } = await params;
  const { books } = await getHadithIndex();
  const meta = books.find((b) => b.slug === book);
  return { title: meta ? meta.nameArabic : "الحديث الشريف" };
}

export default async function HadithBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ book: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { book } = await params;
  const { page, q } = await searchParams;
  const { books } = await getHadithIndex();
  const meta = books.find((b) => b.slug === book);
  if (!meta) notFound();

  const pageNum = Number(page) || 1;
  const result = await getHadithPage(book, pageNum, q);
  if (!result) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title={meta.nameArabic} subtitle={`${meta.total.toLocaleString("ar-EG")} حديث`} backHref="/hadith" />
      <div className="px-6"><HadithSearchBox initial={q ?? ""} /></div>

      {result.items.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--muted-on-night)]">لا توجد نتائج. جرّب كلمات بحث أخرى.</p>
      ) : (
        <ol className="px-6 pt-4">
          {result.items.map((item) => (
            <li key={item.number} className="border-b border-white/[0.06] py-6 last:border-0">
              <Link href={`/hadith/${book}/${item.number}`} className="focus-ring block rounded-xl">
                <span className="mb-2 flex items-center gap-2 text-xs text-gold-bright"><span className="h-px w-5 bg-gold/60" />حديث رقم {item.number.toLocaleString("ar-EG")}</span>
                <p className="line-clamp-4 text-[17px] leading-9 text-[var(--ivory)]">{item.text}</p>
              </Link>
              <div className="mt-3"><CopyShareBar text={`${item.text} — ${meta.nameArabic}: ${item.number}`} /></div>
            </li>
          ))}
        </ol>
      )}

      <Pagination page={result.page} totalPages={result.pages} basePath={`/hadith/${book}`} extraParams={q ? { q } : undefined} />
    </div>
  );
}
