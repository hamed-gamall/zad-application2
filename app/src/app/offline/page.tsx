import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-8 text-center">
      <svg aria-hidden viewBox="0 0 120 120" className="mb-6 h-32 w-32">
        <circle cx="60" cy="60" r="52" fill="rgba(47,158,130,.08)" stroke="#e3c987" strokeOpacity=".35" />
        <path d="M60 14l9 9h14v14l9 9-9 9v14H69l-9 9-9-9H37V55l-9-9 9-9V23h14z" fill="none" stroke="#e3c987" strokeOpacity=".5" strokeWidth="1" />
        <path d="M32 50a40 40 0 0 1 56 0M42 62a26 26 0 0 1 36 0M52 74a12 12 0 0 1 16 0" fill="none" stroke="#e3c987" strokeWidth="3" strokeLinecap="round" opacity=".9" />
        <path d="M30 96 90 28" stroke="#061512" strokeWidth="9" strokeLinecap="round" /><path d="M30 96 90 28" stroke="#e3c987" strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="86" r="3.5" fill="#e3c987" />
      </svg>
      <h1 className="font-display text-4xl text-[var(--ivory)]">لا يوجد اتصال</h1>
      <p className="mt-3 leading-loose text-[var(--muted-on-night)]">الصفحات التي زرتها سابقًا قد تظل متاحة. أما مواقيت الصلاة والاستماع للتلاوة فتحتاج إلى الإنترنت.</p>
      <Link href="/" prefetch={false} className="pressable focus-ring mt-8 inline-flex h-12 items-center rounded-full bg-white/[0.08] px-8 text-gold-bright">حاول مجددًا</Link>
    </div>
  );
}
