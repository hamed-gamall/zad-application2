"use client";

// A large ring with a gold arc. Children sit in the middle. Used by Adhkar
// and Tasbih; `pulse` increments to replay a calm feedback bloom on each tap.
export default function CircularCounter({
  value,
  total,
  size = 280,
  stroke = 8,
  pulse = 0,
  complete = false,
  children,
}: {
  value: number;
  total: number;
  size?: number;
  stroke?: number;
  pulse?: number;
  complete?: boolean;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size, maxWidth: "100%" }}>
      <span
        key={pulse}
        aria-hidden
        className="counter-bloom absolute inset-3 rounded-full"
        style={{ background: complete ? "radial-gradient(circle, rgba(227,201,135,.35), transparent 70%)" : "radial-gradient(circle, rgba(47,158,130,.22), transparent 70%)" }}
      />
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} style={{ fill: "var(--surface-strong)", stroke: "var(--glass-line)" }} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#goldArc)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset .45s cubic-bezier(.16,1,.3,1)" }}
        />
        <defs>
          <linearGradient id="goldArc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e3c987" />
            <stop offset="1" stopColor="#c8a45a" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
