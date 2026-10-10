"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { openAppMenu } from "@/components/AppMenu";

const I = (p: React.ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{p}</svg>
);
const QURAN = I(<><path d="M4 5.5c2.4-1 5-1 8 .3v13c-3-1.3-5.6-1.3-8-.3z" /><path d="M20 5.5c-2.4-1-5-1-8 .3v13c3-1.3 5.6-1.3 8-.3z" /></>);
const LISTEN = I(<><path d="M9 18V6l10-2v12" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></>);
const AZKAR = I(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />);
const MORE = I(<><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></>);

const LEFT = [
  { href: "/quran", label: "القرآن", icon: QURAN },
  { href: "/reciters", label: "الاستماع", icon: LISTEN },
];
const RIGHT = [{ href: "/azkar", label: "الأذكار", icon: AZKAR }];

// Routes where the content is the interface: the dock steps out of the way.
const IMMERSIVE = [/^\/quran\/\d+/, /^\/tools\/(tasbih|qibla)/, /^\/azkar\/[^/]+/];

export default function FloatingDock() {
  const pathname = usePathname();
  const [scrolledAway, setScrolledAway] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      if (Math.abs(y - lastY.current) > 8) {
        setScrolledAway(y > lastY.current && y > 120);
        lastY.current = y;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const immersive = IMMERSIVE.some((r) => r.test(pathname));
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));
  const item = (it: { href: string; label: string; icon: React.ReactNode }) => (
    <Link key={it.href} href={it.href} aria-current={active(it.href) ? "page" : undefined} className="dock-item focus-ring">
      {it.icon}
      <span className="dock-label">{it.label}</span>
    </Link>
  );

  return (
    <nav className="dock" data-hidden={immersive || scrolledAway} aria-label="التنقل الرئيسي">
      <div className="dock-inner glass">
        {LEFT.map(item)}
        <Link href="/" aria-label="الرئيسية" aria-current={pathname === "/" ? "page" : undefined} className="dock-home focus-ring">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" width={56} height={56} />
        </Link>
        {RIGHT.map(item)}
        <button type="button" onClick={openAppMenu} aria-haspopup="dialog" className="dock-item focus-ring">
          {MORE}
          <span className="dock-label">المزيد</span>
        </button>
      </div>
    </nav>
  );
}
