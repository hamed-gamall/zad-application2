import type { Metadata } from "next";
import { getAzkar, getDua } from "@/lib/data";
import ScreenHeader from "@/components/ui/ScreenHeader";
import AdhkarDuaBrowser from "@/components/AdhkarDuaBrowser";

export const metadata: Metadata = {
  title: "الأذكار والأدعية",
  description: "أذكار الصباح والمساء وسائر أذكار المسلم اليومية، إلى جانب مكتبة الأدعية المأثورة لكل حال ومناسبة.",
};

export default async function AzkarIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const { categories: azkar } = await getAzkar();
  const { categories: dua } = await getDua();
  const initialTab = tab === "dua" || tab === "azkar" ? tab : "all";

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="الأذكار والأدعية" subtitle={`${(azkar.length + dua.length).toLocaleString("ar-EG")} بابًا مأثورًا`} />
      <AdhkarDuaBrowser azkar={azkar} dua={dua} initialTab={initialTab} />
    </div>
  );
}
