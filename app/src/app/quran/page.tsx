import type { Metadata } from "next";
import { getSurahList } from "@/lib/data";
import SurahBrowser from "@/components/SurahBrowser";
import ScreenHeader from "@/components/ui/ScreenHeader";

export const metadata: Metadata = {
  title: "القرآن الكريم — فهرس السور",
  description: "تصفّح سور القرآن الكريم الـ 114، بحث بالاسم أو رقم السورة، وتصفية حسب مكان النزول.",
};

export default async function QuranIndexPage() {
  const surahs = await getSurahList();
  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="القرآن الكريم" subtitle="١١٤ سورة · اقرأ، استمع، وتدبّر" />
      <SurahBrowser surahs={surahs} />
    </div>
  );
}
