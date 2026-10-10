// Illuminated cartouche for the start of a surah: gold hairline frame with
// pointed ends and the surah name set inside. Pure SVG.
export default function SurahBanner({ name, meta }: { name: string; meta?: string }) {
  return (
    <div className="relative mx-auto my-6 w-full max-w-md text-center text-gold-bright" role="heading" aria-level={1}>
      <svg viewBox="0 0 400 84" className="w-full" aria-hidden>
        <defs>
          <linearGradient id="bn" x1="0" x2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity=".1" />
            <stop offset=".5" stopColor="currentColor" />
            <stop offset="1" stopColor="currentColor" stopOpacity=".1" />
          </linearGradient>
        </defs>
        <path d="M30 42 L52 10 H348 L370 42 L348 74 H52 Z" fill="rgba(47,158,130,.08)" stroke="url(#bn)" strokeWidth="1.4" />
        <path d="M44 42 L60 18 H340 L356 42 L340 66 H60 Z" fill="none" stroke="currentColor" strokeOpacity=".28" strokeWidth=".8" />
        <path d="M6 42 l12-6 12 6-12 6z M394 42 l-12-6-12 6 12 6z" fill="currentColor" fillOpacity=".7" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl leading-none text-[var(--ivory)]">{name}</span>
        {meta && <span className="mt-1 text-[11px] text-[var(--muted-on-night)]">{meta}</span>}
      </div>
    </div>
  );
}
