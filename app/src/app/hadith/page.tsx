import type { Metadata } from "next";
import Link from "next/link";
import { getHadithIndex } from "@/lib/data";
import ScreenHeader from "@/components/ui/ScreenHeader";
import BookCover from "@/components/ui/BookCover";

export const metadata: Metadata = {
  title: "الحديث الشريف",
  description: "تصفّح تسعة كتب حديث أصلية: صحيح البخاري، صحيح مسلم، سنن أبي داود، الترمذي، النسائي، ابن ماجه، مسند أحمد، موطأ مالك، سنن الدارمي.",
};

export default async function HadithIndexPage() {
  const { books } = await getHadithIndex();
  const total = books.reduce((s, b) => s + b.total, 0);
  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="الحديث الشريف" subtitle={`${books.length.toLocaleString("ar-EG")} كتب · ${total.toLocaleString("ar-EG")} حديثًا`} />
      <ul className="grid grid-cols-2 gap-x-5 gap-y-8 px-6 pt-2">
        {books.map((b) => (
          <li key={b.slug}>
            <Link href={`/hadith/${b.slug}`} className="pressable focus-ring block">
              <BookCover title={b.nameArabic} seed={b.slug} className="w-full" />
              <span className="mt-3 block text-center text-xs text-[var(--muted-on-night)]">{b.total.toLocaleString("ar-EG")} حديث</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mx-auto mt-10 max-w-sm px-8 text-center text-xs leading-relaxed text-[var(--muted-on-night)]">
        المصدر يعرض متن الحديث فقط دون الإسناد أو الدرجة، لذلك لا نعرض حكمًا على الصحة. للعثور على حديث بعينه استخدم <Link href="/search" className="text-gold-bright underline">البحث الشامل</Link>.
      </p>
    </div>
  );
}
