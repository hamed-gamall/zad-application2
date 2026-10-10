// Mihrab-style arch outline for passages (Hadith, Dua). Gold hairline, pointed top.
export default function ArchFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative mx-auto max-w-md ${className}`}>
      <svg aria-hidden viewBox="0 0 300 520" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-gold-bright">
        <path d="M12 520 V190 C12 120 90 70 150 8 C210 70 288 120 288 190 V520" fill="rgba(6,21,18,.35)" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
        <path d="M24 520 V196 C24 130 96 86 150 30 C204 86 276 130 276 196 V520" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="relative px-9 pb-10 pt-24">{children}</div>
    </div>
  );
}
