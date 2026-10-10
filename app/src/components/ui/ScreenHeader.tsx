import Link from "next/link";

// Quiet page header for browse screens: a large display title and, when
// there is somewhere to go back to, one round back control. No toolbar.
export default function ScreenHeader({
  title,
  subtitle,
  backHref,
  action,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-3 px-6 pb-4 pt-6">
      <div className="min-w-0">
        {backHref && (
          <Link href={backHref} aria-label="رجوع" className="fcontrol focus-ring mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
          </Link>
        )}
        <h1 className="font-display text-4xl leading-tight text-[var(--ivory)]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--muted-on-night)]">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
