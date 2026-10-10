// Generated book cover: tinted leather, gold double frame, small star and the
// title set in display type. Used for the Hadith collections.
const TINTS: [string, string][] = [["#1f6f5c", "#0b2a22"], ["#2d6a79", "#0b2630"], ["#7a5a33", "#241a0e"], ["#5b7f4a", "#14261a"], ["#2f9e82", "#0f3d36"], ["#8a7a3a", "#2a2410"]];
function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

export default function BookCover({ title, seed, className = "" }: { title: string; seed: string; className?: string }) {
  const [c1, c2] = TINTS[hash(seed) % TINTS.length];
  const id = `bc${hash(seed)}`;
  return (
    <div className={`relative overflow-hidden rounded-[10px] shadow-[0_18px_36px_-14px_rgba(0,0,0,.8)] ${className}`} style={{ aspectRatio: "3 / 4" }}>
      <svg viewBox="0 0 90 120" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient></defs>
        <rect width="90" height="120" fill={`url(#${id})`} />
        <rect x="3" y="0" width="5" height="120" fill="#000" opacity=".25" />
        <rect x="10" y="7" width="74" height="106" fill="none" stroke="#e3c987" strokeOpacity=".7" strokeWidth=".8" />
        <rect x="13" y="10" width="68" height="100" fill="none" stroke="#e3c987" strokeOpacity=".3" strokeWidth=".5" />
        <path d="M47 22l4 4h6v6l4 4-4 4v6h-6l-4 4-4-4h-6v-6l-4-4 4-4v-6h6z" fill="none" stroke="#e3c987" strokeWidth=".7" />
        <path d="M47 29l7 7-7 7-7-7z" fill="#e3c987" fillOpacity=".25" stroke="#e3c987" strokeWidth=".5" />
      </svg>
      <span className="font-display absolute inset-x-3 bottom-[18%] text-center text-[1.05rem] font-bold leading-tight text-[#f3ecd9]" style={{ textShadow: "0 1px 6px rgba(0,0,0,.6)" }}>{title}</span>
    </div>
  );
}
