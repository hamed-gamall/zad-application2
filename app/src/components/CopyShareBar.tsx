"use client";

import { useState } from "react";
import { generateShareImage, downloadBlob, canShareNatively, shareImageNatively } from "@/lib/shareImage";
import { SITE_NAME } from "@/lib/site";

export default function CopyShareBar({
  text,
  shareTitle,
  className = "",
}: {
  text: string;
  shareTitle?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<"share" | "whatsapp" | null>(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — ignore silently */
    }
  }

  async function buildImageBlob() {
    return generateShareImage(text, shareTitle);
  }

  // Caption shared alongside the image (kept separate from `text`, which is
  // also used for copy-to-clipboard and shouldn't have the link tacked on).
  const caption = `${text}\n\n${SITE_NAME}`;

  async function handleShare() {
    if (busy) return;
    setBusy("share");
    try {
      const blob = await buildImageBlob();

      // Inside the Android app: the embedded WebView does not reliably
      // support navigator.share() with file attachments (it often silently
      // drops the file and sends text only) — go through the native share
      // sheet instead, which always attaches the image correctly.
      if (canShareNatively()) {
        await shareImageNatively(blob, "zad-almuslim.png", shareTitle ?? SITE_NAME, caption);
        return;
      }

      const file = new File([blob], "zad-almuslim.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
      };
      if (nav.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: shareTitle ?? SITE_NAME, text: caption });
      } else if (navigator.share) {
        // Device supports sharing but not files — share the text instead.
        await navigator.share({ title: shareTitle ?? SITE_NAME, text: caption });
      } else {
        downloadBlob(file, "zad-almuslim.png");
      }
    } catch {
      /* user cancelled, or image generation failed — fail silently */
    } finally {
      setBusy(null);
    }
  }

  async function handleWhatsapp() {
    if (busy) return;
    setBusy("whatsapp");
    try {
      const blob = await buildImageBlob();

      if (canShareNatively()) {
        // Opens Android's real share sheet with the image attached — the
        // person picks WhatsApp from it, image included, same as any other
        // app that shares images natively.
        await shareImageNatively(blob, "zad-almuslim.png", shareTitle ?? SITE_NAME, caption);
        return;
      }

      const file = new File([blob], "zad-almuslim.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
      };
      if (nav.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: shareTitle ?? SITE_NAME, text: caption });
        return;
      }
      // No file-sharing support (most desktop browsers): download the
      // image and open WhatsApp with the text pre-filled so it can be
      // attached manually.
      downloadBlob(file, "zad-almuslim.png");
      window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, "_blank", "noopener,noreferrer");
    } catch {
      /* user cancelled, or image generation failed — fail silently */
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        onClick={handleCopy}
        className="pressable focus-ring flex h-11 items-center justify-center rounded-full bg-white/[0.08] px-5 text-sm font-medium text-[var(--ivory)] disabled:opacity-50"
        aria-label="نسخ"
      >
        {copied ? "تم النسخ ✓" : "نسخ"}
      </button>
      <button
        onClick={handleShare}
        disabled={busy !== null}
        className="pressable focus-ring flex h-11 items-center justify-center rounded-full bg-white/[0.08] px-5 text-sm font-medium text-[var(--ivory)] disabled:opacity-50"
        aria-label="مشاركة كصورة"
      >
        {busy === "share" ? "جارٍ التجهيز..." : "مشاركة"}
      </button>
      <button
        onClick={handleWhatsapp}
        disabled={busy !== null}
        className="pressable focus-ring flex h-11 items-center justify-center rounded-full bg-white/[0.08] px-5 text-sm font-medium text-[var(--ivory)] disabled:opacity-50"
        aria-label="مشاركة عبر واتساب كصورة"
      >
        {busy === "whatsapp" ? "جارٍ التجهيز..." : "واتساب"}
      </button>
    </div>
  );
}
