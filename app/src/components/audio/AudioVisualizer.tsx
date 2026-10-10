// Calm CSS-only equaliser. No Web Audio analysis (it would break background
// playback and cross-origin streams); bars simply breathe while playing.
export default function AudioVisualizer({ active, bars = 28 }: { active: boolean; bars?: number }) {
  return (
    <div className="flex h-10 items-end justify-center gap-[3px]" aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className="eq-bar" style={{ height: `${14 + ((i * 37) % 26)}px`, animationDuration: `${0.8 + ((i * 13) % 7) / 10}s`, animationDelay: `${(i % 9) * 0.07}s`, animationPlayState: active ? "running" : "paused", opacity: active ? 1 : 0.35 }} />
      ))}
    </div>
  );
}
