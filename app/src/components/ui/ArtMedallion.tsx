// Generated artwork for reciters, stations, tawashih, names and categories.
// There are no portraits to ship, so every identity gets a unique but
// consistent emblem: an n-fold star rosette tinted from a hash of its seed.
// Pure SVG, no assets to load.
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const TINTS = [
  ["#1f6f5c", "#0b2a22"],
  ["#2f9e82", "#0f3d36"],
  ["#8a7a3a", "#2a2410"],
  ["#2d6a79", "#0b2630"],
  ["#5b7f4a", "#14261a"],
  ["#7a5a33", "#241a0e"],
];

function star(n: number, r1: number, r2: number, rot: number) {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const a = (Math.PI * i) / n + rot;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

export default function ArtMedallion({
  seed,
  glyph,
  className = "",
  rounded = "rounded-[28%]",
}: {
  seed: string;
  glyph?: string;
  className?: string;
  rounded?: string;
}) {
  const h = hash(seed);
  const [c1, c2] = TINTS[h % TINTS.length];
  const n = 8 + (h % 3) * 2; // 8, 10 or 12 points
  const id = `m${h}`;
  return (
    <div className={`relative isolate overflow-hidden ${rounded} ${className}`} style={{ aspectRatio: "1" }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id={id} cx="50%" cy="38%" r="75%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${id})`} />
        <polygon points={star(n, 46, 30, 0)} fill="none" stroke="#e3c987" strokeOpacity=".22" strokeWidth=".6" />
        <polygon points={star(n, 38, 24, Math.PI / n)} fill="none" stroke="#e3c987" strokeOpacity=".34" strokeWidth=".6" />
        <polygon points={star(n, 28, 18, 0)} fill="#e3c987" fillOpacity=".06" stroke="#e3c987" strokeOpacity=".5" strokeWidth=".7" />
        <circle cx="50" cy="50" r="12" fill="#061512" fillOpacity=".55" stroke="#e3c987" strokeOpacity=".6" strokeWidth=".6" />
      </svg>
      {glyph && (
        <span className="font-display absolute inset-0 flex items-center justify-center text-[1.6em] leading-none text-gold-bright">
          {glyph}
        </span>
      )}
    </div>
  );
}
