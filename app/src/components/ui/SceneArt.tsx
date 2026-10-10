// Illustrated backdrops (pure SVG, no image downloads): a mosque skyline under
// a crescent moon, layered mountain ridges with mist, deterministic stars.
// They always render dark — wrap text on top in `.force-dark` (see globals.css).
type Variant = "dusk" | "night" | "mountains";

const SKY: Record<Variant, string[]> = {
  dusk: ["#07201d", "#12403a", "#5b5a35", "#b9803f"],
  night: ["#04100e", "#0a2a26", "#134038", "#1d5a4c"],
  mountains: ["#04100e", "#0a2622", "#103a33", "#1c5446"],
};

function stars(count: number, seed: number) {
  const out: { x: number; y: number; r: number; o: number }[] = [];
  let a = seed;
  const rnd = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < count; i++) out.push({ x: rnd() * 400, y: rnd() * 120, r: 0.3 + rnd() * 0.9, o: 0.25 + rnd() * 0.65 });
  return out;
}

function Minaret({ x, h, w = 7, base = 160 }: { x: number; h: number; w?: number; base?: number }) {
  const top = base - h;
  return (
    <g>
      <rect x={x - w / 2} y={top} width={w} height={h} />
      <rect x={x - w * 0.95} y={top + h * 0.18} width={w * 1.9} height={3} />
      <path d={`M${x - w * 0.62} ${top} L${x} ${top - h * 0.22} L${x + w * 0.62} ${top}Z`} />
      <path d={`M${x} ${top - h * 0.22} v-7`} stroke="currentColor" strokeWidth=".8" />
      <circle cx={x} cy={top - h * 0.22 - 9} r="2.2" />
    </g>
  );
}
function Dome({ cx, r, base }: { cx: number; r: number; base: number }) {
  return (
    <g>
      <path d={`M${cx - r} ${base} A${r} ${r * 1.12} 0 0 1 ${cx + r} ${base}Z`} />
      <path d={`M${cx} ${base - r * 1.12} v-9`} stroke="currentColor" strokeWidth="1" />
      <circle cx={cx} cy={base - r * 1.12 - 11} r="1.8" />
    </g>
  );
}

function Skyline() {
  return (
    <g style={{ color: "#030d0b", fill: "#030d0b" }}>
      <path d="M0 160 V128 H18 V120 H40 V128 H70 V160Z" />
      <Minaret x={34} h={92} />
      <rect x="58" y="126" width="84" height="34" />
      <Dome cx={100} r={22} base={126} />
      <Minaret x={150} h={108} w={8} />
      <rect x="156" y="118" width="116" height="42" />
      <Dome cx={214} r={42} base={118} />
      <Dome cx={170} r={13} base={118} />
      <Dome cx={258} r={13} base={118} />
      <Minaret x={276} h={112} w={8} />
      <rect x="282" y="128" width="62" height="32" />
      <Dome cx={318} r={19} base={128} />
      <Minaret x={360} h={86} />
      <path d="M344 160 V132 H400 V160Z" />
      {/* warm windows */}
      <g style={{ fill: "#e9b45c", opacity: 0.85 }}>
        {[[200, 140], [214, 140], [228, 140], [176, 146], [252, 146], [92, 142], [110, 142], [318, 146], [148, 70], [276, 60], [34, 78], [360, 86]].map(([x, y], i) => (
          <rect key={i} x={x - 1.5} y={y} width="3" height="5" rx="1.4" />
        ))}
      </g>
    </g>
  );
}

function Ridge({ d, fill, opacity = 1 }: { d: string; fill: string; opacity?: number }) {
  return <path d={d} fill={fill} opacity={opacity} />;
}

export default function SceneArt({
  variant = "dusk",
  skyline = true,
  className = "",
  moon = true,
}: {
  variant?: Variant;
  skyline?: boolean;
  className?: string;
  moon?: boolean;
}) {
  const [c0, c1, c2, c3] = SKY[variant];
  const id = `sky-${variant}`;
  const st = stars(variant === "dusk" ? 26 : 46, 7 + variant.length);
  return (
    <div aria-hidden className={`scene-art pointer-events-none ${className}`}>
      <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" className="h-full w-full">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c0} />
            <stop offset=".5" stopColor={c1} />
            <stop offset=".82" stopColor={c2} />
            <stop offset="1" stopColor={c3} />
          </linearGradient>
          <radialGradient id={`${id}-glow`} cx=".5" cy="1" r=".7">
            <stop offset="0" stopColor={variant === "dusk" ? "#f0a64d" : "#4fd1b0"} stopOpacity={variant === "dusk" ? ".55" : ".25"} />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-mist`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9fd8c6" stopOpacity="0" />
            <stop offset="1" stopColor="#9fd8c6" stopOpacity=".22" />
          </linearGradient>
        </defs>
        <rect width="400" height="200" fill={`url(#${id})`} />
        {st.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />)}
        <rect width="400" height="200" fill={`url(#${id}-glow)`} />
        {moon && (
          <g transform="translate(262 40)">
            <circle r="26" fill="#e3c987" opacity=".08" />
            <circle r="15" fill="#f3e3b0" />
            <circle cx="6" cy="-3" r="13" fill={c1} />
          </g>
        )}
        {variant === "mountains" ? (
          <>
            <Ridge d="M0 120 C40 90 70 100 110 80 S180 60 230 90 S320 70 400 100 V200 H0Z" fill="#0d3a33" opacity={0.65} />
            <Ridge d="M0 140 C50 112 90 128 140 106 S230 96 280 120 S350 110 400 130 V200 H0Z" fill="#082a25" opacity={0.85} />
            <Ridge d="M0 165 C60 145 110 158 170 142 S270 140 320 156 S380 150 400 158 V200 H0Z" fill="#041a17" />
            <rect y="120" width="400" height="80" fill={`url(#${id}-mist)`} />
          </>
        ) : (
          <>
            <Ridge d="M0 128 C40 104 80 118 130 96 S210 84 260 108 S340 100 400 118 V200 H0Z" fill="#0a2d28" opacity={0.7} />
            {skyline && (
              <g transform="translate(0 40)">
                <Skyline />
              </g>
            )}
            <rect y="150" width="400" height="50" fill="#030d0b" />
            <rect y="130" width="400" height="40" fill={`url(#${id}-mist)`} />
          </>
        )}
      </svg>
    </div>
  );
}
