import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-8 text-center">
      <svg aria-hidden viewBox="0 0 48 48" className="mb-5 h-14 w-14 text-gold"><path d="M24 2l6 6h8v8l6 6-6 6v8h-8l-6 6-6-6h-8v-8l-6-6 6-6V8h8z" fill="rgba(200,164,90,.12)" stroke="currentColor" strokeWidth="1.2" /></svg>
      <h1 className="font-display text-4xl text-[var(--ivory)]">الصفحة غير موجودة</h1>
      <p className="mt-3 leading-loose text-[var(--muted-on-night)]">الرابط غير صحيح أو تم نقل المحتوى.</p>
      <Link href="/" className="pressable focus-ring mt-8 inline-flex h-12 items-center rounded-full bg-gradient-to-l from-gold-bright to-gold px-9 font-semibold text-[#1a1407]">العودة للرئيسية</Link>
    </div>
  );
}
