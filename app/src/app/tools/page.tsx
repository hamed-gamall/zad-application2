import type { Metadata } from "next";
import Link from "next/link";
import ScreenHeader from "@/components/ui/ScreenHeader";
import ArtMedallion from "@/components/ui/ArtMedallion";

export const metadata: Metadata = {
  title: "الأدوات الإسلامية",
  description: "مواقيت الصلاة، اتجاه القبلة، التقويم الهجري، والسبحة الإلكترونية.",
};

const TOOLS = [
  { href: "/tools/prayer-times", title: "مواقيت الصلاة", desc: "مواقيت الصلوات الخمس بحسب موقعك الحالي، مع الوقت المتبقي للصلاة القادمة." },
  { href: "/tools/qibla", title: "اتجاه القبلة", desc: "احسب زاوية اتجاه القبلة من موقعك إلى الكعبة المشرّفة." },
  { href: "/tools/tasbih", title: "السبحة الإلكترونية", desc: "سبحة رقمية أنيقة لعدّ التسبيح والتحميد والتكبير." },
  { href: "/tools/calendar", title: "التقويم الهجري", desc: "التاريخ الهجري الحالي وتحويل التاريخ مع المناسبات الإسلامية." },
  { href: "/tools/radio", title: "الإذاعات القرآنية", desc: "استمع مباشرة إلى إذاعات القرآن الكريم، واحفظ إذاعتك المفضّلة." },
  { href: "/tools/tawashih", title: "التواشيح والابتهالات", desc: "استمع إلى التواشيح والابتهالات الدينية بأصوات كبار المنشدين والمبتهلين." },
  { href: "/tools/quran-video-generator", title: "مولّد فيديو قرآني", desc: "أنشئ فيديو آيات بصوت قارئك المفضّل، بمقاس وخلفية وخط تختارهم، مع معاينة قبل التحميل." },
  { href: "/names", title: "أسماء الله الحسنى ", desc: "«وَلِلَّهِ الْأَسْمَاءُ الْحُسْنَىٰ فَادْعُوهُ بِهَا» — 99 اسمًا مع المعنى والاستماع." },
];

const GROUPS: { title: string; hrefs: string[]; glyph: string }[] = [
  { title: "الوقت والاتجاه", hrefs: ["/tools/qibla", "/tools/calendar"], glyph: "✦" },
  { title: "ذكر وتأمّل", hrefs: ["/tools/tasbih", "/names"], glyph: "○" },
  { title: "استماع وإبداع", hrefs: ["/tools/radio", "/tools/tawashih", "/tools/quran-video-generator"], glyph: "♪" },
];

export default function ToolsPage() {
  const by = (h: string) => TOOLS.find((t) => t.href === h)!;
  const prayer = by("/tools/prayer-times");
  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="الأدوات" subtitle="رفيقك اليومي، بلا حساب ولا تسجيل" />

      <div className="px-6">
        <Link href={prayer.href} className="pressable focus-ring relative block overflow-hidden rounded-[32px] p-6" style={{ background: "linear-gradient(135deg, #0f3d36, #071e19 70%)", boxShadow: "inset 0 0 0 1px rgba(227,201,135,.18)" }}>
          <svg aria-hidden viewBox="-100 -100 200 200" className="absolute -start-10 -top-10 h-56 w-56 opacity-40">
            {[0, 15, 30, 45, 60, 75].map((r) => <rect key={r} x="-60" y="-60" width="120" height="120" fill="none" stroke="#e3c987" strokeWidth=".6" transform={`rotate(${r})`} />)}
          </svg>
          <p className="relative text-xs text-gold-bright">الأكثر استخدامًا</p>
          <h2 className="font-display relative mt-1 text-4xl text-[var(--ivory)]">{prayer.title}</h2>
          <p className="relative mt-2 max-w-[18rem] text-sm leading-relaxed text-[var(--muted-on-night)]">{prayer.desc}</p>
        </Link>
      </div>

      {GROUPS.map((g) => (
        <section key={g.title} className="mt-9 px-6" aria-label={g.title}>
          <h2 className="font-display mb-2 text-2xl text-[var(--ivory)]">{g.title}</h2>
          <ul>
            {g.hrefs.map((h) => {
              const t = by(h);
              return (
                <li key={h}>
                  <Link href={t.href} className="pressable focus-ring flex items-center gap-4 rounded-2xl px-1 py-3 hover:bg-white/[0.04]">
                    <ArtMedallion seed={t.title} glyph={g.glyph} className="w-14 text-2xl" rounded="rounded-[22px]" />
                    <span className="min-w-0 flex-1">
                      <span className="font-display block text-xl text-[var(--ivory)]">{t.title.trim()}</span>
                      <span className="line-clamp-2 block text-xs leading-relaxed text-[var(--muted-on-night)]">{t.desc}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
