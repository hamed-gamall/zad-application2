// Quiet divider: hairline, small gold diamond cluster, hairline.
export default function Ornament({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 16" className={`mx-auto h-4 w-48 text-gold-bright ${className}`} aria-hidden>
      <path d="M0 8h96M144 8h96" stroke="currentColor" strokeOpacity=".4" strokeWidth="1" />
      <path d="M120 1l7 7-7 7-7-7z" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M120 5l3 3-3 3-3-3z" fill="currentColor" />
      <path d="M100 8l4-4 4 4-4 4zM132 8l4-4 4 4-4 4z" fill="currentColor" fillOpacity=".7" />
    </svg>
  );
}
