"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-8 text-center">
      <svg aria-hidden viewBox="0 0 48 48" className="mb-5 h-14 w-14 text-gold"><path d="M24 2l6 6h8v8l6 6-6 6v8h-8l-6 6-6-6h-8v-8l-6-6 6-6V8h8z" fill="rgba(200,164,90,.12)" stroke="currentColor" strokeWidth="1.2" /></svg>
      <h1 className="font-display text-4xl text-[var(--ivory)]">حدث خطأ غير متوقع</h1>
      <p className="mt-3 leading-loose text-[var(--muted-on-night)]">نأسف على الإزعاج. حاول مرة أخرى، وإن استمرت المشكلة عاود لاحقًا.</p>
      <button onClick={reset} className="pressable focus-ring mt-8 h-12 rounded-full bg-gradient-to-l from-gold-bright to-gold px-9 font-semibold text-[#1a1407]">إعادة المحاولة</button>
    </div>
  );
}
