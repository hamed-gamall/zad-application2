import Link from "next/link";
import PrayerHero from "@/components/PrayerHero";
import GreetingLine from "@/components/GreetingLine";
import ContinueQuran from "@/components/ContinueQuran";
import DailyAdhkarBanner from "@/components/DailyAdhkarBanner";
import FridayBanner from "@/components/FridayBanner";
import DailyContentSection from "@/components/DailyContentSection";
import SceneArt from "@/components/ui/SceneArt";
import { getDailyContent, utcContentSlot } from "@/lib/dailyContent";
import { getSurahList } from "@/lib/data";

export const revalidate = 21600;

const ic = (p: React.ReactNode) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{p}</svg>
);
const TILES = [
  { href: "/quran", label: "القرآن", icon: ic(<><path d="M4 5.5c2.4-1 5-1 8 .3v13c-3-1.3-5.6-1.3-8-.3z" /><path d="M20 5.5c-2.4-1-5-1-8 .3v13c3-1.3 5.6-1.3 8-.3z" /></>) },
  { href: "/azkar", label: "الأذكار", icon: ic(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />) },
  { href: "/hadith", label: "الحديث", icon: ic(<><path d="M6 4h11a2 2 0 0 1 2 2v12H8a2 2 0 0 1-2-2z" /><path d="M10 8h6M10 12h6" /></>) },
  { href: "/dua", label: "الدعاء", icon: ic(<path d="M12 21c-4-3-7-6-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 4-3 7-7 10z" />) },
  { href: "/tools/tasbih", label: "التسبيح", icon: ic(<><circle cx="12" cy="12" r="8" strokeDasharray="1 4.2" strokeWidth="3.2" /><circle cx="12" cy="12" r="2" /></>) },
  { href: "/tools/prayer-times", label: "الصلاة", icon: ic(<><path d="M5 20v-8a7 7 0 0 1 14 0v8M3 20h18" /><path d="M12 5V2" /></>) },
  { href: "/tools/qibla", label: "القبلة", icon: ic(<><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>) },
  { href: "/reciters", label: "الاستماع", icon: ic(<><path d="M9 18V6l10-2v12" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></>) },
];

export default async function HomePage() {
  const [dailyContent, surahs] = await Promise.all([getDailyContent(utcContentSlot()), getSurahList()]);
  const surahNames = Object.fromEntries(surahs.map((s) => [parseInt(s.index, 10), s.titleAr]));
  const surahPages = Object.fromEntries(surahs.map((s) => [parseInt(s.index, 10), Number(s.page || s.pages || 1)]));

  return (
    <div className="mx-auto max-w-2xl">
      {/* Illustrated header: always dark so the greeting stays readable in any theme */}
      <div className="force-dark relative isolate">
        <SceneArt variant="night" className="absolute inset-x-0 top-0 -z-10 h-[330px]" />
        <header className="flex items-start justify-between px-6 pt-5">
          <div>
            <p className="font-display text-3xl text-[var(--ivory)]">السلام عليكم</p>
            <GreetingLine className="mt-0.5 text-sm text-[var(--muted-on-night)]" />
          </div>
          <Link href="/search" aria-label="بحث" className="pressable focus-ring glass flex h-12 w-12 items-center justify-center rounded-full text-gold-bright">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" /></svg>
          </Link>
        </header>
        <div className="h-24" />
        <PrayerHero />
      </div>

      <div className="mt-4">
        <FridayBanner />
        <DailyAdhkarBanner />
      </div>

      <section className="px-5" aria-labelledby="journey">
        <h2 id="journey" className="font-display mb-3 px-1 text-2xl text-[var(--ivory)]">رحلتك اليوم</h2>
        <ul className="grid grid-cols-4 gap-2.5">
          {TILES.map((t) => (
            <li key={t.href}>
              <Link href={t.href} className="pressable focus-ring glass flex aspect-square flex-col items-center justify-center gap-2 rounded-[22px] text-gold-bright">
                {t.icon}
                <span className="text-[12px] text-[var(--ivory)]">{t.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 px-5">
        <ContinueQuran surahNames={surahNames} surahPages={surahPages} />
      </div>

      <DailyContentSection initial={dailyContent} />

      <p className="font-display mx-auto mt-4 max-w-md px-8 text-center text-lg leading-loose text-gold-bright/80">
        اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ ﷺ
      </p>
    </div>
  );
}
