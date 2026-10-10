"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// "المزيد" — a bottom sheet instead of the old side drawer. Grouped by what
// the person is trying to do; swipe down (or tap outside) to dismiss.
const GROUPS: { title: string; items: { href: string; label: string; glyph: string }[] }[] = [
  {
    title: "الصلاة والاتجاه",
    items: [
      { href: "/tools/prayer-times", label: "مواقيت الصلاة", glyph: "◐" },
      { href: "/tools/qibla", label: "القبلة", glyph: "✦" },
      { href: "/tools/calendar", label: "التقويم الهجري", glyph: "☾" },
    ],
  },
  {
    title: "ذكر وقراءة",
    items: [
      { href: "/tools/tasbih", label: "السبحة", glyph: "○" },
      { href: "/hadith", label: "الحديث الشريف", glyph: "❦" },
      { href: "/names", label: "أسماء الله الحسنى", glyph: "۞" },
    ],
  },
  {
    title: "استماع",
    items: [
      { href: "/tools/radio", label: "إذاعات القرآن", glyph: "◉" },
      { href: "/tools/tawashih", label: "التواشيح والابتهالات", glyph: "♪" },
      { href: "/tools/quran-video-generator", label: "فيديو قرآني", glyph: "▶" },
    ],
  },
  {
    title: "شخصي",
    items: [
      { href: "/search", label: "بحث", glyph: "⌕" },
      { href: "/my", label: "مكتبتي", glyph: "❖" },
      { href: "/settings", label: "الإعدادات", glyph: "⚙" },
      { href: "/about", label: "عن زاد المسلم", glyph: "ℹ" },
    ],
  },
];

const OPEN_EVENT = "zad:open-menu";

/** Lets other components open this same sheet without prop drilling. */
export function openAppMenu() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_EVENT));
}

export default function AppMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <>
      <div className="sheet-backdrop" data-open={open} onClick={() => setOpen(false)} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="المزيد"
        aria-hidden={!open}
        className="sheet glass"
        data-open={open}
        onTouchStart={(e) => (startY.current = e.touches[0].clientY)}
        onTouchEnd={(e) => {
          if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 70) setOpen(false);
          startY.current = null;
        }}
      >
        <div className="sheet-grab" />
        {GROUPS.map((g) => (
          <section key={g.title} className="mb-5">
            <h2 className="mb-2 px-1 text-sm text-[var(--muted-on-night)]">{g.title}</h2>
            <ul className="grid grid-cols-3 gap-2">
              {g.items.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    tabIndex={open ? 0 : -1}
                    className="pressable focus-ring flex h-full min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-white/[0.04] px-2 py-3 text-center text-[13px] text-[var(--text-on-night)] hover:bg-white/[0.08]"
                  >
                    <span className="font-display text-2xl text-gold-bright" aria-hidden>{it.glyph}</span>
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </aside>
    </>
  );
}
