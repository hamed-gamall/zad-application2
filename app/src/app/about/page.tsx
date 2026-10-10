import type { Metadata } from "next";
import { EXACT_PRAYER_TEXT } from "@/lib/exactPrayer";
import CopyShareBar from "@/components/CopyShareBar";
import ScreenHeader from "@/components/ui/ScreenHeader";
import Ornament from "@/components/ui/Ornament";
import ContactForm from "@/components/ContactForm";

const CONTACT_EMAIL = "zad.almuslim.site@gmail.com";

export const metadata: Metadata = {
  title: "عن الموقع",
  description: "عن زَادُ المُسْلِم، ودعاء للموتى بالرحمة والمغفرة.",
};

export default function AboutPage() {
  const prayerLines = EXACT_PRAYER_TEXT.split("\n");

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="عن زاد المسلم" backHref="/settings" />
      <section className="relative isolate px-7 pb-8 pt-2 text-center">
        <div className="prayer-glow" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-512.png" alt="" className="mx-auto w-36 rounded-[32px] shadow-[0_24px_60px_-18px_rgba(0,0,0,.8)]" />
        <p className="mt-6 text-lg leading-[2.2] text-[var(--ivory)]">
          «زَادُ المُسْلِم» محاولة متواضعة لجمع ما يحتاجه المسلم في يومه في مكان واحد: القرآن الكريم بتلاوته وتفسيره، الحديث الشريف من أمّهات كتبه، الأذكار والأدعية المأثورة، ومواقيت الصلاة واتجاه القبلة أينما كان. لا حساب يُطلب منك، ولا بيانات تُجمع عنك.
        </p>
        <p className="mt-4 text-sm leading-loose text-[var(--muted-on-night)]">نسأل الله أن ينفع به، وأن يجعله عملًا خالصًا لوجهه الكريم، وأن يتقبّله ممن ساهم فيه وممن استخدمه.</p>
      </section>

      <section className="mx-6 rounded-[28px] glass p-5">
        <h2 className="font-display text-2xl text-[var(--ivory)]">تواصل معنا</h2>
        <p className="mb-4 mt-1 text-sm text-[var(--muted-on-night)]">عندك رسالة أو اقتراح؟ يسعدنا أن نسمعه.</p>
        <ContactForm toEmail={CONTACT_EMAIL} />
      </section>

      <Ornament className="my-10" />

      <section className="px-7 text-center">
        <p className="text-sm leading-loose text-[var(--muted-on-night)]">
          لحظة هادئة قبل أن تكمل: هذا الدعاء المأثور في الصلاة على الميت يصلح للدعاء لكل ميت مسلم، رجلًا كان أو امرأة. دقيقتان من وقتك، ثم اتركه يصعد بما تيسّر من إخلاص.
        </p>
        <h2 className="font-display mt-8 text-3xl text-gold-bright">دعاء للميت</h2>
        <div className="font-quran mt-5 space-y-3 text-2xl leading-[2.2] text-[var(--ivory)]" dir="rtl">
          {prayerLines.map((line, i) => <p key={i}>{line}</p>)}
        </div>
        <div className="mt-6 flex justify-center"><CopyShareBar text={EXACT_PRAYER_TEXT} shareTitle="دعاء للميت" /></div>
        <p className="font-display mt-10 text-xl text-gold-bright/90">اللهم اغفر لموتى المسلمين أجمعين، وارحمهم برحمتك يا أرحم الراحمين.</p>
      </section>
    </div>
  );
}
