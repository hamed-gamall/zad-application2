"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// Full-screen content with chrome that disappears. Tap empty space to reveal
// the floating controls; they fade out again after a few idle seconds.
export default function ImmersiveScreen({
  title,
  subtitle,
  backHref = "/",
  top,
  bottom,
  background,
  hideAfterMs = 3800,
  alwaysShow = false,
  scroll = false,
  paper = false,
  dark = false,
  children,
}: {
  title?: string;
  subtitle?: string;
  backHref?: string;
  top?: React.ReactNode;
  bottom?: React.ReactNode;
  background?: React.ReactNode;
  hideAfterMs?: number;
  alwaysShow?: boolean;
  scroll?: boolean;
  /** Fill the screen with warm page paper (Mushaf pages). */
  paper?: boolean;
  /** Art-backed screens always render dark so text stays readable in any theme. */
  dark?: boolean;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const arm = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!alwaysShow) timer.current = setTimeout(() => setVisible(false), hideAfterMs);
  }, [alwaysShow, hideAfterMs]);

  useEffect(() => {
    arm();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [arm]);

  function onSurfaceTap(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("a,button,input,select,textarea,[data-ayah],[role=dialog]")) {
      if (visible) arm();
      return;
    }
    setVisible((v) => {
      if (!v) arm();
      return !v;
    });
  }

  return (
    <div className={`immersive ${paper ? "immersive-paper" : ""} ${dark ? "force-dark" : ""}`} onClick={onSurfaceTap}>
      {background}
      <div className="immersive-top" data-visible={visible}>
        <Link href={backHref} aria-label="رجوع" className="fcontrol focus-ring">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
        </Link>
        {(title || subtitle) && (
          <div className="glass min-w-0 flex-1 rounded-full px-4 py-1.5 text-center">
            {title && <p className="font-display truncate text-lg leading-tight text-[var(--ivory)]">{title}</p>}
            {subtitle && <p className="truncate text-[11px] text-[var(--muted-on-night)]">{subtitle}</p>}
          </div>
        )}
        <div className="flex items-center gap-2">{top}</div>
      </div>
      {scroll ? <div className="immersive-scroll">{children}</div> : children}
      {bottom && (
        <div className="immersive-bottom" data-visible={visible}>
          <div className="glass flex items-center justify-center gap-1 rounded-full p-1.5">{bottom}</div>
        </div>
      )}
    </div>
  );
}
