"use client";

import { useEffect, useState } from "react";
import { getFavorites, toggleFavorite } from "@/lib/storage";
import { generateShareImage, downloadBlob, canShareNatively, shareImageNatively } from "@/lib/shareImage";
import { SITE_NAME } from "@/lib/site";
import { BookmarkIcon, BookmarkCheckIcon, CopyIcon, CheckIcon, Share2Icon } from "@/components/icons/Icons";

export default function HadithActions({
  book,
  bookName,
  number,
  text,
}: {
  book: string;
  bookName: string;
  number: number;
  text: string;
}) {
  const id = `hadith:${book}:${number}`;
  const [fav, setFav] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFav(getFavorites().some((f) => f.id === id));
  }, [id]);

  function onFav() {
    const next = toggleFavorite({
      id,
      type: "hadith",
      label: `${bookName} — حديث رقم ${number}`,
      text,
      savedAt: Date.now(),
    });
    setFav(next.some((f) => f.id === id));
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(`${text} — ${bookName}: ${number}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function onShare() {
    if (sharing) return;
    setSharing(true);
    const label = `${bookName} — حديث رقم ${number}`;
    // Caption shared alongside the image; kept separate from the plain
    // copy-to-clipboard text in onCopy, which shouldn't have the link tacked on.
    const caption = `${text} — ${label}\n\n${SITE_NAME}`;
    try {
      const blob = await generateShareImage(text, label);

      if (canShareNatively()) {
        await shareImageNatively(blob, "zad-almuslim.png", bookName, caption);
        return;
      }

      const file = new File([blob], "zad-almuslim.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: SITE_NAME, text: caption });
      } else if (navigator.share) {
        await navigator.share({ title: bookName, text: caption });
      } else {
        downloadBlob(file, "zad-almuslim.png");
        window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, "_blank", "noopener,noreferrer");
      }
    } catch {
      /* cancelled, or image generation failed */
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        onClick={onFav}
        className={`fcontrol focus-ring ${fav ? "fcontrol-on" : ""}`}
      >
        {fav ? <BookmarkCheckIcon size={14} /> : <BookmarkIcon size={14} />}
        {fav ? "محفوظ" : "حفظ"}
      </button>
      <button
        onClick={onCopy}
        className="fcontrol focus-ring disabled:opacity-50"
      >
        {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
        {copied ? "تم النسخ" : "نسخ"}
      </button>
      <button
        onClick={onShare}
        disabled={sharing}
        className="fcontrol focus-ring disabled:opacity-50"
      >
        <Share2Icon size={14} />
        {sharing ? "جارٍ التجهيز..." : "مشاركة"}
      </button>
    </div>
  );
}
