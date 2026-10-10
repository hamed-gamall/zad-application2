// A string of wooden prayer beads curving across the screen (pure SVG).
// Decorative backdrop for the Tasbih screen; always dark/warm.
export default function BeadsArt({ className = "" }: { className?: string }) {
  const beads = Array.from({ length: 19 }, (_, i) => {
    const t = i / 18;
    const x = -10 + t * 420;
    const y = 120 + Math.sin(t * Math.PI) * -70 + (1 - t) * 18;
    const r = 11 + Math.sin(t * Math.PI) * 6;
    return { x, y, r };
  });
  return (
    <div aria-hidden className={`pointer-events-none ${className}`}>
      <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMax meet" className="h-full w-full">
        <defs>
          <radialGradient id="bead" cx=".35" cy=".3" r=".8">
            <stop offset="0" stopColor="#b98b4e" />
            <stop offset=".55" stopColor="#6b4a24" />
            <stop offset="1" stopColor="#2a1a0c" />
          </radialGradient>
          <linearGradient id="beadbg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0a1f1a" />
            <stop offset="1" stopColor="#030d0b" />
          </linearGradient>
        </defs>
        <rect width="400" height="200" fill="url(#beadbg)" />
        <path d={`M-10 138 ${beads.map((b) => `L${b.x} ${b.y}`).join(" ")}`} stroke="#d9b36a" strokeOpacity=".5" strokeWidth="1" fill="none" />
        {beads.map((b, i) => (
          <g key={i}>
            <circle cx={b.x + 2} cy={b.y + 3} r={b.r} fill="#000" opacity=".35" />
            <circle cx={b.x} cy={b.y} r={b.r} fill="url(#bead)" />
            <circle cx={b.x - b.r * 0.3} cy={b.y - b.r * 0.35} r={b.r * 0.22} fill="#fff" opacity=".25" />
          </g>
        ))}
        <g transform="translate(205 66)">
          <rect x="-3" y="0" width="6" height="26" rx="3" fill="#caa05a" />
          <path d="M0 26 l-9 40 h18z" fill="#8a5f2c" />
          <path d="M-9 66 h18" stroke="#caa05a" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}
