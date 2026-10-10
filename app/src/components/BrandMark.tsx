// A small, crisp vector mark for "زَادُ المُسلِم": an open book cradled by a
// crescent, inside a rounded frame. Renders in `currentColor` so it inherits
// whatever accent color is applied to it (gold on dark backgrounds, etc.).
export default function BrandMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="1" y="1" width="38" height="38" rx="11" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
      <path
        d="M20 13.5c-2.3-1.7-5.4-2.4-8.3-1.7v13.6c2.9-0.7 6-0.1 8.3 1.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 13.5c2.3-1.7 5.4-2.4 8.3-1.7v13.6c-2.9-0.7-6-0.1-8.3 1.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 13.5v14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M27.5 9.2a4.4 4.4 0 1 0 4 6.6 5.4 5.4 0 1 1 -4-6.6Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}
