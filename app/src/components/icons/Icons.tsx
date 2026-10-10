import type { ReactNode } from "react";

// Small line-icon set (stroke = currentColor) matching the look of the
// lucide-react icons used in the reference designs, without adding a new
// dependency — the project already uses hand-rolled inline SVGs elsewhere
// (BrandMark, MobileBottomNav).
type IconProps = { size?: number; className?: string };

function base(children: ReactNode, { size = 18, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const ScrollTextIcon = (p: IconProps) =>
  base(
    <>
      <path d="M8 21h8a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
      <path d="M19 17V5a2 2 0 0 0-2-2H8" />
      <path d="M12 9h5M12 13h5" />
    </>,
    p
  );

export const SearchIcon = (p: IconProps) =>
  base(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </>,
    p
  );

export const XIcon = (p: IconProps) => base(<path d="M18 6 6 18M6 6l12 12" />, p);

export const BookmarkIcon = (p: IconProps) =>
  base(<path d="M19 21 12 16l-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />, p);

export const BookmarkCheckIcon = (p: IconProps) =>
  base(
    <>
      <path d="M19 21 12 16l-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill="currentColor" fillOpacity="0.15" />
      <path d="M19 21 12 16l-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      <path d="m9 10 2 2 4-4" />
    </>,
    p
  );

export const CopyIcon = (p: IconProps) =>
  base(
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>,
    p
  );

export const CheckIcon = (p: IconProps) => base(<path d="M20 6 9 17l-5-5" />, p);

export const Share2Icon = (p: IconProps) =>
  base(
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5" />
    </>,
    p
  );

export const ChevronRightIcon = (p: IconProps) => base(<path d="m9 18 6-6-6-6" />, p);
export const ChevronLeftIcon = (p: IconProps) => base(<path d="m15 18-6-6 6-6" />, p);

export const HeadphonesIcon = (p: IconProps) =>
  base(
    <path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />,
    p
  );

export const Mic2Icon = (p: IconProps) =>
  base(
    <>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
    </>,
    p
  );

export const CalendarDaysIcon = (p: IconProps) =>
  base(
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </>,
    p
  );

export const ArrowLeftRightIcon = (p: IconProps) =>
  base(
    <>
      <path d="m17 3 4 4-4 4" />
      <path d="M21 7H3" />
      <path d="m7 21-4-4 4-4" />
      <path d="M3 17h18" />
    </>,
    p
  );

export const PlayIcon = (p: IconProps) => base(<path d="M6 3v18l15-9Z" />, p);
export const PauseIcon = (p: IconProps) =>
  base(
    <>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </>,
    p
  );
export const SkipBackIcon = (p: IconProps) =>
  base(
    <>
      <path d="M19 20 9 12l10-8z" />
      <path d="M5 19V5" />
    </>,
    p
  );
export const MailIcon = (p: IconProps) =>
  base(
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m4 6 8 7 8-7" />
    </>,
    p
  );

export const DownloadIcon = (p: IconProps) =>
  base(
    <>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>,
    p
  );

export const VideoIcon = (p: IconProps) =>
  base(
    <>
      <path d="m22 8-6 4 6 4V8Z" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </>,
    p
  );

export const WandIcon = (p: IconProps) =>
  base(
    <>
      <path d="m15 4 1.5 1.5M18 2l1 1M20 6l1.5 1.5M3 21l9-9M12.5 8.5 15 6" />
    </>,
    p
  );

export const ImageIcon = (p: IconProps) =>
  base(
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </>,
    p
  );

export const SkipForwardIcon = (p: IconProps) =>
  base(
    <>
      <path d="M5 4l10 8-10 8z" />
      <path d="M19 5v14" />
    </>,
    p
  );

// ---- Section-tile icons (homepage) — kept in the same hand-rolled,
// currentColor line style as the rest of this file / MobileBottomNav /
// AppMenu, so the homepage tiles read as part of the same icon family
// rather than a mismatched set pulled from elsewhere.
export const QuranBookIcon = (p: IconProps) =>
  base(
    <>
      <path d="M4 5.5c2.4-1 5-1 8 .3v13c-3-1.3-5.6-1.3-8-.3z" />
      <path d="M20 5.5c-2.4-1-5-1-8 .3v13c3-1.3 5.6-1.3 8-.3z" />
    </>,
    p
  );

export const HadithScrollIcon = (p: IconProps) =>
  base(<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z" />, p);

export const AzkarHeartIcon = (p: IconProps) =>
  base(
    <path d="M12 21s-7-4.35-9.5-8.5C1 9 2.5 5.5 6 5c2-.3 3.7.7 6 3 2.3-2.3 4-3.3 6-3 3.5.5 5 4 3.5 7.5C19 16.65 12 21 12 21z" />,
    p
  );

export const ToolsIcon = (p: IconProps) =>
  base(<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.2 2.2-2.8-2.8z" />, p);

export const RefreshIcon = (p: IconProps) =>
  base(
    <>
      <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
      <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M3 21v-5h5" />
    </>,
    p
  );

export const RadioWaveIcon = (p: IconProps) =>
  base(
    <>
      <circle cx="12" cy="12" r="2.3" />
      <path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6" />
      <path d="M5 5a9.4 9.4 0 0 0 0 14M19 5a9.4 9.4 0 0 1 0 14" />
    </>,
    p
  );

