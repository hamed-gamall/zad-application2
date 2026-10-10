import type { Metadata } from "next";
import { getTawashihList } from "@/lib/data";
import ScreenHeader from "@/components/ui/ScreenHeader";
import TawashihBrowser from "@/components/tawashih/TawashihBrowser";

export const metadata: Metadata = {
  title: "التواشيح والابتهالات",
  description: "استمع إلى التواشيح والابتهالات الدينية بأصوات كبار المنشدين والمبتهلين.",
};

export default async function TawashihPage() {
  let reciters: Awaited<ReturnType<typeof getTawashihList>> | null = null;
  try {
    reciters = await getTawashihList();
  } catch {
    reciters = null;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="التواشيح والابتهالات" subtitle="أصوات كبار المنشدين والمبتهلين" backHref="/tools" />
      {!reciters || reciters.length === 0 ? (
        <p className="mx-6 mt-6 rounded-3xl bg-white/[0.05] p-6 text-center text-sm text-[var(--muted-on-night)]">تعذّر تحميل القائمة الآن. حاول تحديث الصفحة.</p>
      ) : (
        <TawashihBrowser reciters={reciters} />
      )}
    </div>
  );
}
