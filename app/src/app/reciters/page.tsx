import type { Metadata } from "next";
import { fetchReciters } from "@/lib/live";
import ScreenHeader from "@/components/ui/ScreenHeader";
import RecitersBrowser from "@/components/audio/RecitersBrowser";

export const metadata: Metadata = {
  title: "المكتبة الصوتية",
  description: "استمع للقرآن الكريم بأصوات مئات القرّاء وبمختلف الروايات — من مكتبة mp3quran.net.",
};

export const revalidate = 86400;

export default async function RecitersPage() {
  let reciters: Awaited<ReturnType<typeof fetchReciters>> | null = null;
  try {
    reciters = await fetchReciters();
  } catch {
    reciters = null;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="الاستماع" subtitle="مئات القرّاء وروايات القرآن الكريم" />
      {!reciters ? (
        <p className="mx-6 mt-6 rounded-3xl bg-white/[0.05] p-6 text-center text-sm text-[var(--muted-on-night)]">تعذّر الاتصال بمكتبة الصوتيات. تحقق من اتصالك ثم حدّث الصفحة.</p>
      ) : (
        <RecitersBrowser reciters={reciters} />
      )}
    </div>
  );
}
