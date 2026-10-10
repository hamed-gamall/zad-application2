"use client";

import { useEffect, useRef } from "react";

// Generic contextual sheet: backdrop tap, Escape and swipe-down all dismiss.
export default function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const startY = useRef<number | null>(null);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  return (
    <>
      <div className="sheet-backdrop" data-open={open} onClick={onClose} aria-hidden />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
        className="sheet glass"
        data-open={open}
        onTouchStart={(e) => (startY.current = e.touches[0].clientY)}
        onTouchEnd={(e) => {
          if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 80) onClose();
          startY.current = null;
        }}
      >
        <div className="sheet-grab" />
        {title && <h2 className="font-display mb-3 text-2xl text-[var(--ivory)]">{title}</h2>}
        {children}
      </section>
    </>
  );
}
