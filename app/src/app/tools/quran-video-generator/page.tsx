import type { Metadata } from "next";
import { getSurahList } from "@/lib/data";
import QuranVideoGenerator from "@/components/videogen/QuranVideoGenerator";
import ScreenHeader from "@/components/ui/ScreenHeader";

export const metadata: Metadata = {
  title: "مولّد فيديو قرآني",
  description: "أنشئ فيديو آيات قرآنية بصوت قارئك المفضّل، بمقاس ومظهر تختاره بنفسك، مع معاينة مباشرة قبل التحميل.",
};

export default async function QuranVideoGeneratorPage() {
  const list = await getSurahList();
  const surahs = list.map((s, i) => ({ number: i + 1, name: s.titleAr, count: s.count }));
  return (
    <div className="mx-auto max-w-3xl pb-8">
      <ScreenHeader title="فيديو قرآني" subtitle="اختر الآيات والقارئ والمظهر وعاين قبل الإنشاء" backHref="/tools" />
      <div className="px-4"><QuranVideoGenerator surahs={surahs} /></div>
    </div>
  );
}
