"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AYAH_AUDIO_RECITERS, ayahAudioUrl } from "@/lib/ayahAudio";
import { SITE_NAME } from "@/lib/site";
import fixWebmDuration from "fix-webm-duration";
import { hasNativeVideoSaver, saveVideoToDevice } from "@/lib/videoSaver";
import { PlayIcon, PauseIcon, DownloadIcon, WandIcon, VideoIcon, ImageIcon } from "@/components/icons/Icons";

interface SurahLite {
  number: number;
  name: string;
  count: number;
}

type Aspect = "9:16" | "16:9";
type BgKind = "gradient" | "color" | "image" | "video";
type FontKey = "amiri-quran" | "amiri" | "cairo" | "tajawal";
type TextPosition = "top" | "center" | "bottom";
type TextAlign = "right" | "center" | "left";
type WrapMode = "multi" | "single";

const GRADIENTS: { id: string; label: string; stops: string[] }[] = [
  { id: "emerald-night", label: "زمرد ليلي", stops: ["#061512", "#0f3d36", "#09231d"] },
  { id: "gold-dusk", label: "ذهب الغروب", stops: ["#1a1407", "#6b5224", "#c8a45a"] },
  { id: "jade-mist", label: "يشب وضباب", stops: ["#071e19", "#1f6f5c", "#2f9e82"] },
  { id: "midnight-blue", label: "أزرق ليلي", stops: ["#050b10", "#0b2630", "#2d6a79"] },
  { id: "desert-sand", label: "رمل صحراوي", stops: ["#241a0e", "#7a5a33", "#c8a45a"] },
  { id: "olive-deep", label: "زيتوني عميق", stops: ["#0a120a", "#14261a", "#5b7f4a"] },
];

// Faint twelve-point star lattice drawn over the procedural gradients, so the
// generated videos carry the same geometric motif as the app itself.
function drawLattice(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cell = Math.max(160, Math.min(w, h) / 4.5);
  ctx.save();
  ctx.strokeStyle = "rgba(227,201,135,0.10)";
  ctx.lineWidth = Math.max(1.5, cell / 120);
  for (let cy = -cell / 2; cy < h + cell; cy += cell) {
    for (let cx = -cell / 2; cx < w + cell; cx += cell) {
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const r = i % 2 ? cell * 0.22 : cell * 0.46;
        const a = (Math.PI * i) / 8;
        const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
}


const FONT_VARS: Record<FontKey, string> = {
  "amiri-quran": "--font-amiri-quran",
  amiri: "--font-amiri",
  cairo: "--font-cairo",
  tajawal: "--font-tajawal",
};
const FONT_LABELS: Record<FontKey, string> = {
  "amiri-quran": "أميري قرآن (خط المصحف)",
  amiri: "أميري",
  cairo: "القاهرة",
  tajawal: "تجوال",
};

function resolveFontFamily(key: FontKey): string {
  if (typeof window === "undefined") return "serif";
  const varName = FONT_VARS[key];
  const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return val ? `${val}, serif` : "serif";
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Reference scale shared by every drawing helper. Sizes were originally
// tuned against a 720x1280 (9:16) canvas using w/1280 (=0.5625) — that
// value looked right. The bug in 16:9 was that w/1280 became 1 there
// (full-size text) while the canvas is only 720px tall, causing overlap.
// Anchoring to the *smaller* canvas dimension instead of raw width
// reproduces the original, correct 9:16 scale (min(720,1280)/1280 = 0.5625)
// and now applies that same, already-proven scale to 16:9 as well
// (min(1280,720)/1280 = 0.5625), so both formats render consistently.
function uiScale(w: number, h: number): number {
  return Math.min(w, h) / 1280;
}

// Samples the pixels already drawn behind a region and returns a readable
// text color: light text on a dark background, dark text on a light one.

interface DrawStyle {
  fontKey: FontKey;
  fontSize: number; // base px at 1280 canvas width reference
  fontColor: string;
  position: TextPosition;
  align: TextAlign;
  bgOpacity: number; // 0-100, dark box behind text
  shadow: boolean;
  wrap: WrapMode;
}

interface DrawMeta {
  surahName: string;
  ayahNumber: number;
  reciterName: string;
  showSurahName: boolean;
  showAyahNumber: boolean;
  showReciterName: boolean;
}

interface BgSpec {
  kind: BgKind;
  gradientId: string;
  color: string;
  imageEl: HTMLImageElement | null;
  videoEl: HTMLVideoElement | null;
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, bg: BgSpec) {
  if (bg.kind === "color") {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (bg.kind === "image" && bg.imageEl && bg.imageEl.complete && bg.imageEl.naturalWidth) {
    drawCover(ctx, bg.imageEl, w, h);
    return;
  }
  if (bg.kind === "video" && bg.videoEl && bg.videoEl.readyState >= 2) {
    drawCover(ctx, bg.videoEl, w, h);
    return;
  }
  // Fallback / default: procedural gradient (also used explicitly when kind === "gradient")
  const preset = GRADIENTS.find((g) => g.id === bg.gradientId) ?? GRADIENTS[0];
  const grad = ctx.createLinearGradient(0, 0, w, h);
  preset.stops.forEach((c, i) => grad.addColorStop(i / (preset.stops.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  drawLattice(ctx, w, h);
  // Subtle radial vignette + faint ring motif for a less-flat look.
  const vign = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75);
  vign.addColorStop(0, "rgba(0,0,0,0)");
  vign.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = Math.max(1, w * 0.002);
  for (let r = 1; r <= 3; r++) {
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, (Math.min(w, h) / 2) * (r / 3.4), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCover(ctx: CanvasRenderingContext2D, media: HTMLImageElement | HTMLVideoElement, w: number, h: number) {
  const mw = "naturalWidth" in media ? media.naturalWidth : media.videoWidth;
  const mh = "naturalHeight" in media ? media.naturalHeight : media.videoHeight;
  if (!mw || !mh) return;
  const scale = Math.max(w / mw, h / mh);
  const dw = mw * scale;
  const dh = mh * scale;
  ctx.drawImage(media, (w - dw) / 2, (h - dh) / 2, dw, dh);
  // Darken slightly so text stays legible on any image/video.
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(0, 0, w, h);
}

function drawVerse(ctx: CanvasRenderingContext2D, w: number, h: number, text: string, style: DrawStyle): number {
  const scale = uiScale(w, h);
  const fontSize = style.fontSize * scale;
  const family = resolveFontFamily(style.fontKey);
  const maxWidth = w * 0.84;

  ctx.font = `${fontSize}px ${family}`;
  ctx.direction = "rtl";
  ctx.textBaseline = "middle";

  let lines: string[];
  let usedFontSize = fontSize;
  if (style.wrap === "single") {
    // Shrink-to-fit on one line instead of wrapping.
    usedFontSize = fontSize;
    ctx.font = `${usedFontSize}px ${family}`;
    while (ctx.measureText(text).width > maxWidth && usedFontSize > 10) {
      usedFontSize -= 2;
      ctx.font = `${usedFontSize}px ${family}`;
    }
    lines = [text];
  } else {
    lines = wrapLines(ctx, text, maxWidth);
  }

  const lineHeight = usedFontSize * 1.7;
  const blockHeight = lines.length * lineHeight;
  let centerY: number;
  if (style.position === "top") centerY = h * 0.22 + blockHeight / 2;
  else if (style.position === "bottom") centerY = h * 0.66 - blockHeight / 2;
  else centerY = h / 2;

  // Alignment anchor is computed up-front so both the background panel and
  // the text itself follow the same right/center/left position.
  ctx.textAlign = style.align === "right" ? "right" : style.align === "left" ? "left" : "center";
  const alignX = style.align === "center" ? w / 2 : style.align === "right" ? w * 0.92 : w * 0.08;

  // Background panel behind the text block — now tracks the chosen
  // alignment instead of always sitting centered on the canvas.
  if (style.bgOpacity > 0) {
    let maxLineWidth = 0;
    for (const l of lines) maxLineWidth = Math.max(maxLineWidth, ctx.measureText(l).width);
    const padX = w * 0.06;
    const padY = lineHeight * 0.35;
    const boxW = Math.min(w * 0.94, maxLineWidth + padX * 2);
    const boxH = blockHeight + padY * 2;

    let boxX: number;
    if (style.align === "right") {
      // Box's right edge sits just past the text's right edge.
      boxX = alignX + padX - boxW;
    } else if (style.align === "left") {
      // Box's left edge sits just before the text's left edge.
      boxX = alignX - padX;
    } else {
      boxX = w / 2 - boxW / 2;
    }
    // Keep the panel fully inside the canvas regardless of alignment.
    boxX = Math.max(w * 0.02, Math.min(boxX, w * 0.98 - boxW));

    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${style.bgOpacity / 100})`;
    roundRect(ctx, boxX, centerY - boxH / 2, boxW, boxH, boxH * 0.12);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.fillStyle = style.fontColor;
  if (style.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = usedFontSize * 0.25;
    ctx.shadowOffsetY = usedFontSize * 0.04;
    ctx.lineWidth = usedFontSize * 0.045;
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
  }
  const startY = centerY - blockHeight / 2 + lineHeight / 2;
  lines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    if (style.shadow) ctx.strokeText(line, alignX, y);
    ctx.fillText(line, alignX, y);
  });
  ctx.restore();

  // Bottom edge of the verse text block, in canvas pixels — used to anchor
  // the surah/ayah/reciter info directly beneath the verse.
  return centerY + blockHeight / 2;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Meta text (surah/ayah/reciter) is sized as a ratio of the verse font
// size, rather than a fixed size, so it scales up and down together with
// the ayah text instead of looking oversized when the verse font is small.
const META_FONT_RATIO = 35 / 58;

function drawMetaBelowVerse(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  meta: DrawMeta,
  verseBottomY: number,
  brandBarTop: number,
  verseFontSize: number
) {
  const scale = uiScale(w, h);
  const family = resolveFontFamily("cairo");

  const bits: string[] = [];
  if (meta.showSurahName) bits.push(`سورة ${meta.surahName}`);
  if (meta.showAyahNumber) bits.push(`آية ${meta.ayahNumber}`);
  if (meta.showReciterName) bits.push(meta.reciterName);
  if (!bits.length) return;

  const metaFontPx = verseFontSize * scale * META_FONT_RATIO;

  ctx.save();
  ctx.font = `${metaFontPx}px ${family}`;
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const label = bits.join("  ·  ");
  const padX = metaFontPx * (25 / 35);
  const boxW = Math.min(w * 0.97, ctx.measureText(label).width + padX * 2);
  const boxH = metaFontPx * (50 / 35);
  const gapBelowVerse = 55 * scale;
  // Always sit directly under the verse text with a small fixed gap — never
  // overlapping the verse. If there simply isn't room before the brand bar
  // (very long text pinned to the bottom), skip drawing it rather than
  // overlapping either element.
  const y = verseBottomY + gapBelowVerse;
  if (y + boxH > brandBarTop - 12 * scale) {
    ctx.restore();
    return;
  }
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  roundRect(ctx, w / 2 - boxW / 2, y, boxW, boxH, boxH / 2);
  ctx.fill();
  ctx.fillStyle = "#f2e7c9";
  ctx.fillText(label, w / 2, y + boxH / 2 + 1);
  ctx.restore();
}

// No credit line / link is drawn any more — the only branding is the moving
// corner watermark. This just returns the lowest y that verse text may use.
function drawBrandBar(_ctx: CanvasRenderingContext2D, w: number, h: number): number {
  return h - 60 * uiScale(w, h);
}

// The watermark visits all four corners in turn (top-right → bottom-right →
// bottom-left → top-left), moving every few seconds so it never blocks the
// same part of the picture for the whole video.
const CORNER_EVERY_MS = 3000;
const CORNERS: Array<"tr" | "br" | "bl" | "tl"> = ["tr", "br", "bl", "tl"];

function drawRotatingWatermark(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  elapsedMs: number,
  totalMs: number,
  logo: HTMLImageElement | null
) {
  const scale = uiScale(w, h);
  const corner = CORNERS[Math.floor(Math.max(0, elapsedMs) / CORNER_EVERY_MS) % CORNERS.length];
  void totalMs;
  const margin = 30 * scale;
  const boxH = 79 * scale;
  const family = resolveFontFamily("cairo");
  ctx.save();
  ctx.font = `800 ${47 * scale}px ${family}`;
  const label = SITE_NAME;
  const logoSize = boxH * 0.70;
  const textW = ctx.measureText(label).width;
  const boxW = logoSize + 16 * scale + textW + 30 * scale;

  const x = corner === "tl" || corner === "bl" ? margin : w - margin - boxW;
  const y = corner === "tl" || corner === "tr" ? margin : h - margin - boxH;

  // Background is transparent; a soft shadow behind the text keeps it
  // readable over any background without a solid box.
  if (logo && logo.complete && logo.naturalWidth) {
    ctx.drawImage(logo, x + 14 * scale, y + (boxH - logoSize) / 2, logoSize, logoSize);
  }
  ctx.direction = "rtl";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 8 * scale;
  ctx.shadowOffsetY = 2 * scale;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, x + 22 * scale + logoSize, y + boxH / 2 + 1);
  ctx.restore();
}

function FileDropInput({
  accept,
  fileName,
  icon,
  hint,
  onFile,
}: {
  accept: string;
  fileName: string | null;
  icon: ReactNode;
  hint: string;
  onFile: (file: File) => void;
}) {
  return (
    <label className="focus-ring group flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-white/10 bg-white/[0.08] px-4 py-4 text-sm transition-colors hover:border-gold hover:bg-emerald/5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold-bright">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-gold-bright group-hover:underline">اضغط هنا لاختيار ملف</span>
        <span className="block truncate text-xs text-[var(--muted-on-night)]">
          {fileName ?? hint}
        </span>
      </span>
      <input
        type="file"
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
        className="sr-only"
      />
    </label>
  );
}

export default function QuranVideoGenerator({ surahs }: { surahs: SurahLite[] }) {
  const [surahNumber, setSurahNumber] = useState(1);
  const [mode, setMode] = useState<"range" | "single">("single");
  const [ayahFrom, setAyahFrom] = useState(1);
  const [ayahTo, setAyahTo] = useState(1);
  const [singleAyah, setSingleAyah] = useState(1);
  const [reciterId, setReciterId] = useState(AYAH_AUDIO_RECITERS[0].id);
  const [aspect, setAspect] = useState<Aspect>("9:16");

  const [bgKind, setBgKind] = useState<BgKind>("gradient");
  const [gradientId, setGradientId] = useState(GRADIENTS[0].id);
  const [color, setColor] = useState("#0f3d36");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);

  const [fontKey, setFontKey] = useState<FontKey>("amiri-quran");
  const [fontSize, setFontSize] = useState(58);
  const [fontColor, setFontColor] = useState("#f3ecd9");
  const [position, setPosition] = useState<TextPosition>("center");
  const [align, setAlign] = useState<TextAlign>("center");
  const [bgOpacity, setBgOpacity] = useState(35);
  const [shadow, setShadow] = useState(true);
  const [wrap, setWrap] = useState<WrapMode>("multi");

  const [showSurahName, setShowSurahName] = useState(true);
  const [showAyahNumber, setShowAyahNumber] = useState(true);
  const [showReciterName, setShowReciterName] = useState(true);

  const [verses, setVerses] = useState<Record<number, { ayah: number; text: string }[]>>({});
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  // The actual Blob, kept alongside its object URL — needed for the native
  // save path below, which re-reads it as base64 (a blob: URL can't be
  // handed to the native Filesystem/Share plugins directly).
  const generatedBlobRef = useRef<Blob | null>(null);
  const [generatedDurationSec, setGeneratedDurationSec] = useState<number | null>(null);
  const generatedMimeTypeRef = useRef<string>("video/webm");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const imageElRef = useRef<HTMLImageElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const logoElRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const exportStateRef = useRef({ startTs: 0, totalMs: 0, elapsedMs: 0, exporting: false });
  const fontsReadyRef = useRef(false);

  const surah = surahs.find((s) => s.number === surahNumber) ?? surahs[0];
  const reciter = AYAH_AUDIO_RECITERS.find((r) => r.id === reciterId)!;

  // Load site logo + wait for fonts once.
  useEffect(() => {
    const img = new Image();
    img.src = "/icons/icon-512.png";
    logoElRef.current = img;
    if ("fonts" in document) {
      document.fonts.ready.then(() => {
        fontsReadyRef.current = true;
      });
    }
  }, []);

  // Fetch verse texts for the chosen surah (cached per surah number).
  useEffect(() => {
    if (verses[surahNumber]) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicking off a network fetch, not deriving from React state
    setLoadingVerses(true);
    setError(null);
    fetch(`/api/quran/text/${surahNumber}`)
      .then((r) => r.json())
      .then((data: { verses: { ayah: number; text: string }[] }) => {
        setVerses((v) => ({ ...v, [surahNumber]: data.verses }));
      })
      .catch(() => setError("تعذّر تحميل نص السورة."))
      .finally(() => setLoadingVerses(false));
  }, [surahNumber, verses]);

  // Clamp ayah selections whenever the surah changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting local UI state when the selected surah changes
    setAyahFrom(1);
    setAyahTo(Math.min(3, surah.count));
    setSingleAyah(1);
    setPreviewIndex(0);
    stopPreview();
    setGeneratedUrl(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surahNumber]);

  // Background image/video object handling.
  useEffect(() => {
    if (bgKind !== "image" || !imageUrl) {
      imageElRef.current = null;
      return;
    }
    const img = new Image();
    img.src = imageUrl;
    imageElRef.current = img;
  }, [bgKind, imageUrl]);

  useEffect(() => {
    if (bgKind !== "video" || !videoUrl) {
      videoElRef.current = null;
      return;
    }
    const v = document.createElement("video");
    v.src = videoUrl;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.play().catch(() => {});
    videoElRef.current = v;
    return () => {
      v.pause();
    };
  }, [bgKind, videoUrl]);

  const validation = useMemo(() => {
    if (mode === "single") {
      if (singleAyah < 1 || singleAyah > surah.count) return `رقم الآية يجب أن يكون بين 1 و${surah.count}.`;
      return null;
    }
    if (ayahFrom < 1 || ayahFrom > surah.count) return `"من آية" يجب أن يكون بين 1 و${surah.count}.`;
    if (ayahTo < 1 || ayahTo > surah.count) return `"إلى آية" يجب أن يكون بين 1 و${surah.count}.`;
    if (ayahFrom > ayahTo) return `"من آية" يجب ألا يكون أكبر من "إلى آية".`;
    return null;
  }, [mode, singleAyah, ayahFrom, ayahTo, surah.count]);

  const selectedAyahs = useMemo(() => {
    if (validation) return [] as number[];
    if (mode === "single") return [singleAyah];
    const arr: number[] = [];
    for (let a = ayahFrom; a <= ayahTo; a++) arr.push(a);
    return arr;
  }, [mode, singleAyah, ayahFrom, ayahTo, validation]);

  const surahVerses = verses[surahNumber];
  const currentAyahText = (n: number) => surahVerses?.find((v) => v.ayah === n)?.text ?? "...";

  const dims = aspect === "9:16" ? { w: 720, h: 1280 } : { w: 1280, h: 720 };

  const bgSpec: BgSpec = {
    kind: bgKind,
    gradientId,
    color,
    imageEl: imageElRef.current,
    videoEl: videoElRef.current,
  };
  const style: DrawStyle = { fontKey, fontSize, fontColor, position, align, bgOpacity, shadow, wrap };

  // Main render loop — redraws the live preview canvas continuously (cheap;
  // needed so a video background keeps animating and the watermark, during
  // export, can rotate smoothly over time).
  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      const { w, h } = dims;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      drawBackground(ctx, w, h, bgSpec);
      // Forced credit bar is always drawn (even before verses load) — it's non-removable.
      const brandBarTop = drawBrandBar(ctx, w, h);

      const ayahN = exportStateRef.current.exporting
        ? selectedAyahs[exportIndexRef.current] ?? selectedAyahs[0]
        : selectedAyahs[previewIndex] ?? selectedAyahs[0];

      if (ayahN != null) {
        const verseBottomY = drawVerse(ctx, w, h, currentAyahText(ayahN), style);
        drawMetaBelowVerse(
          ctx,
          w,
          h,
          {
            surahName: surah.name,
            ayahNumber: ayahN,
            reciterName: reciter.name,
            showSurahName,
            showAyahNumber,
            showReciterName,
          },
          verseBottomY,
          brandBarTop,
          style.fontSize
        );
      }

      if (exportStateRef.current.exporting) {
        const elapsed = performance.now() - exportStateRef.current.startTs;
        drawRotatingWatermark(ctx, w, h, elapsed, exportStateRef.current.totalMs, logoElRef.current);
      }
    }
    rafRef.current = requestAnimationFrame(renderLoop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dims.w, dims.h, bgKind, gradientId, color, imageUrl, videoUrl, style, selectedAyahs, previewIndex, surah.name, reciter.name, showSurahName, showAyahNumber, showReciterName]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [renderLoop]);

  // ---------------- Preview playback (not recorded) ----------------
  function stopPreview() {
    previewAudioRef.current?.pause();
    setPreviewPlaying(false);
  }

  function playPreview() {
    if (!selectedAyahs.length) return;
    setPreviewIndex(0);
    const audio = previewAudioRef.current;
    if (!audio) return;
    audio.src = ayahAudioUrl(reciter.folder, surahNumber, selectedAyahs[0]);
    audio.play().then(() => setPreviewPlaying(true)).catch(() => setPreviewPlaying(false));
  }

  function togglePreview() {
    if (previewPlaying) {
      stopPreview();
      return;
    }
    playPreview();
  }

  function onPreviewEnded() {
    const nextIdx = previewIndex + 1;
    if (nextIdx < selectedAyahs.length) {
      setPreviewIndex(nextIdx);
      const audio = previewAudioRef.current;
      if (audio) {
        audio.src = ayahAudioUrl(reciter.folder, surahNumber, selectedAyahs[nextIdx]);
        audio.play().catch(() => {});
      }
    } else {
      setPreviewPlaying(false);
    }
  }

  // ---------------- Export / recording ----------------
  const exportIndexRef = useRef(0);
  const chunksRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  async function generateVideo() {
    if (!selectedAyahs.length || validation) return;
    setGenError(null);
    setDownloadError(null);
    setDownloadSuccess(false);
    setGeneratedUrl(null);
    generatedBlobRef.current = null;
    setIsGenerating(true);
    setGenProgress(0);

    // Capability checks up front, with a specific message for each — this
    // is the actual thing that was making generation fail silently/
    // confusingly inside the Android app: some of these APIs (MediaRecorder
    // in particular) are less consistently available across Android system
    // WebView versions/OEM builds than in a full desktop/mobile browser, so
    // the exact same code that works on the website can hit a capability
    // that just isn't there here. Catching that explicitly, instead of
    // letting it throw two steps later inside a generic try/catch, is what
    // actually lets us tell what's going wrong instead of guessing.
    if (typeof MediaRecorder === "undefined") {
      setGenError("متصفح الجهاز لا يدعم تسجيل الفيديو (MediaRecorder غير متاح). جرّب تحديث تطبيق Android System WebView من متجر Google Play، أو استخدم الموقع من متصفح Chrome.");
      setIsGenerating(false);
      return;
    }
    const canvasEl = canvasRef.current;
    if (!canvasEl || typeof canvasEl.captureStream !== "function") {
      setGenError("متصفح الجهاز لا يدعم تصوير الشاشة (captureStream غير متاح). جرّب تحديث تطبيق Android System WebView من متجر Google Play.");
      setIsGenerating(false);
      return;
    }
    const mimeCandidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m));
    if (!mimeType) {
      setGenError("متصفح الجهاز لا يدعم أي صيغة فيديو مناسبة للتسجيل حاليًا. جرّب تحديث تطبيق Android System WebView من متجر Google Play.");
      setIsGenerating(false);
      return;
    }

    try {
      // 1) Preload durations for every ayah clip so we know the total video length.
      const durations: number[] = [];
      for (const a of selectedAyahs) {
        const d = await new Promise<number>((resolve) => {
          const probe = new Audio();
          probe.src = ayahAudioUrl(reciter.folder, surahNumber, a);
          probe.addEventListener("loadedmetadata", () => resolve(probe.duration || 4));
          probe.addEventListener("error", () => resolve(4));
        });
        durations.push(d);
      }
      const LEAD_MS = 700;
      const TAIL_MS = 1500;
      const totalMs = durations.reduce((a, b) => a + b, 0) * 1000 + LEAD_MS + TAIL_MS;

      const canvas = canvasRef.current!;
      const videoStream = canvas.captureStream(30);

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();
      // A brand-new element every time (never the persistent JSX-rendered
      // one) — the Web Audio spec permanently ties an <audio>/<video>
      // element to whichever MediaElementAudioSourceNode first captures it;
      // calling createMediaElementSource a second time on the *same*
      // element (e.g. generating a second video in the same session)
      // throws "already connected to a different MediaElementAudioSourceNode".
      // That's a real, reproducible crash this used to hit on any repeat
      // generation, not something specific to Android.
      const exportAudio = new Audio();
      exportAudio.crossOrigin = "anonymous";
      const srcNode = audioCtx.createMediaElementSource(exportAudio);
      srcNode.connect(dest);
      srcNode.connect(audioCtx.destination); // also audible while generating

      const combined = new MediaStream([...videoStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);

      const recorder = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: 4_000_000 });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      exportStateRef.current = { startTs: performance.now(), totalMs, elapsedMs: 0, exporting: true };
      exportIndexRef.current = 0;
      recorder.start(250);

      let lastProgressUpdate = 0;
      await new Promise<void>((resolveAll, rejectAll) => {
        function playIdx(idx: number) {
          if (idx >= selectedAyahs.length) {
            // Hold the last frame briefly so the video ends cleanly, then stop.
            setTimeout(() => {
              exportStateRef.current.exporting = false;
              try {
                recorder.stop();
              } catch {
                /* already stopped */
              }
              resolveAll();
            }, TAIL_MS);
            return;
          }
          // Watchdog: a stalled download must never leave the recording open-ended.
          const limit = (durations[idx] || 4) * 1000 + 8000;
          const watchdog = setTimeout(() => {
            if (exportIndexRef.current === idx) playIdx(idx + 1);
          }, limit);
          exportAudio.addEventListener("ended", () => clearTimeout(watchdog), { once: true });
          exportIndexRef.current = idx;
          exportAudio.src = ayahAudioUrl(reciter.folder, surahNumber, selectedAyahs[idx]);
          exportAudio.currentTime = 0;
          exportAudio
            .play()
            .catch((err) => {
              exportStateRef.current.exporting = false;
              try {
                recorder.stop();
              } catch {
                /* already stopped */
              }
              rejectAll(err);
            });
        }
        exportAudio.onended = () => {
          const now = performance.now();
          if (now - lastProgressUpdate > 200) {
            lastProgressUpdate = now;
            const elapsed = now - exportStateRef.current.startTs;
            setGenProgress(Math.min(1, elapsed / Math.max(1, totalMs)));
          }
          playIdx(exportIndexRef.current + 1);
        };
        exportAudio.ontimeupdate = () => {
          const now = performance.now();
          if (now - lastProgressUpdate > 200) {
            lastProgressUpdate = now;
            const elapsed = now - exportStateRef.current.startTs;
            setGenProgress(Math.min(1, elapsed / Math.max(1, totalMs)));
          }
        };
        setTimeout(() => playIdx(0), LEAD_MS); // short lead-in before the first ayah
      });

      await stopped;
      setGenProgress(1);
      const rawBlob = new Blob(chunksRef.current, { type: mimeType });
      // MediaRecorder writes WebM with NO duration header, so players show an
      // endless/unknown length and can't seek. Stamp the real duration in.
      const recordedMs = Math.max(1000, performance.now() - exportStateRef.current.startTs);
      const blob = await new Promise<Blob>((resolve) => {
        try {
          fixWebmDuration(rawBlob, recordedMs, (fixed: Blob) => resolve(fixed));
        } catch {
          resolve(rawBlob);
        }
      });
      generatedBlobRef.current = blob;
      setGeneratedDurationSec(Math.round(recordedMs / 1000));
      // Strip any codec parameters (e.g. ";codecs=vp9,opus") — MediaStore's
      // MIME_TYPE column expects a plain registered type, not a
      // codecs-qualified one.
      generatedMimeTypeRef.current = mimeType.split(";")[0];
      const url = URL.createObjectURL(blob);
      setGeneratedUrl(url);
    } catch (err) {
      // Surfacing the real reason (instead of one generic message for every
      // possible failure) is what actually lets a stuck case get diagnosed
      // and fixed, rather than everyone seeing the same unhelpful text.
      const reason = err instanceof Error && err.message ? err.message : null;
      setGenError(reason ? `حدث خطأ أثناء إنشاء الفيديو: ${reason}` : "حدث خطأ أثناء إنشاء الفيديو. جرّب مرة أخرى.");
    } finally {
      exportStateRef.current.exporting = false;
      setIsGenerating(false);
      audioCtxRef.current?.close().catch(() => {});
    }
  }

  const downloadName = `${SITE_NAME.replace(/\s+/g, "-")}-سورة-${surah.name}-${selectedAyahs[0] ?? ""}${
    selectedAyahs.length > 1 ? `-${selectedAyahs[selectedAyahs.length - 1]}` : ""
  }.webm`;

  async function saveVideoNatively() {
    const blob = generatedBlobRef.current;
    if (!blob || isDownloading) return;
    setDownloadError(null);
    setDownloadSuccess(false);
    setIsDownloading(true);
    try {
      await saveVideoToDevice(
        blob,
        downloadName,
        generatedMimeTypeRef.current,
        // Matches the app's actual launcher name (android:label in
        // AndroidManifest.xml / strings.xml) rather than SITE_NAME's
        // diacritized display form, since this becomes a real, visible
        // folder name under Movies/ on the person's device.
        "زاد المسلم"
      );
      setDownloadSuccess(true);
    } catch (err) {
      const reason = err instanceof Error && err.message ? err.message : null;
      setDownloadError(reason ?? "تعذّر حفظ الفيديو. حاول مرة أخرى.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      {/* -------- Controls -------- */}
      <div className="space-y-6 order-2 lg:order-1">
        <section className="rounded-2xl bg-white/[0.06] p-4">
          <h2 className="mb-3 font-display text-lg font-bold">الآيات</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted-on-night)]">السورة</span>
              <select
                value={surahNumber}
                onChange={(e) => setSurahNumber(Number(e.target.value))}
                className="focus-ring w-full rounded-2xl bg-white/[0.06] px-3 py-2"
              >
                {surahs.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.number}. {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted-on-night)]">القارئ</span>
              <select
                value={reciterId}
                onChange={(e) => setReciterId(e.target.value)}
                className="focus-ring w-full rounded-2xl bg-white/[0.06] px-3 py-2"
              >
                {AYAH_AUDIO_RECITERS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setMode("single")}
              className={`focus-ring rounded-full border px-3 py-1.5 text-xs font-semibold ${
                mode === "single" ? "border-gold bg-gold/10 text-gold-bright" : "border-white/10"
              }`}
            >
              آية واحدة
            </button>
            <button
              onClick={() => setMode("range")}
              className={`focus-ring rounded-full border px-3 py-1.5 text-xs font-semibold ${
                mode === "range" ? "border-gold bg-gold/10 text-gold-bright" : "border-white/10"
              }`}
            >
              مجموعة آيات
            </button>
          </div>

          {mode === "single" ? (
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-[var(--muted-on-night)]">رقم الآية (1–{surah.count})</span>
              <input
                type="number"
                min={1}
                max={surah.count}
                value={singleAyah}
                onChange={(e) => setSingleAyah(Number(e.target.value))}
                className="focus-ring w-32 rounded-2xl bg-white/[0.06] px-3 py-2"
              />
            </label>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-[var(--muted-on-night)]">من آية</span>
                <input
                  type="number"
                  min={1}
                  max={surah.count}
                  value={ayahFrom}
                  onChange={(e) => setAyahFrom(Number(e.target.value))}
                  className="focus-ring w-full rounded-2xl bg-white/[0.06] px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-[var(--muted-on-night)]">إلى آية</span>
                <input
                  type="number"
                  min={1}
                  max={surah.count}
                  value={ayahTo}
                  onChange={(e) => setAyahTo(Number(e.target.value))}
                  className="focus-ring w-full rounded-2xl bg-white/[0.06] px-3 py-2"
                />
              </label>
            </div>
          )}
          {validation && <p className="mt-2 text-xs text-gold-bright">{validation}</p>}
          {error && <p className="mt-2 text-xs text-gold-bright">{error}</p>}
          {loadingVerses && <p className="mt-2 text-xs text-[var(--muted-on-night)]">جارٍ تحميل نص السورة...</p>}
        </section>

        <section className="rounded-2xl bg-white/[0.06] p-4">
          <h2 className="mb-3 font-display text-lg font-bold">مقاس الفيديو</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setAspect("9:16")}
              className={`focus-ring rounded-full border px-4 py-1.5 text-xs font-semibold ${
                aspect === "9:16" ? "border-gold bg-gold/10 text-gold-bright" : "border-white/10"
              }`}
            >
              9:16 — TikTok / Reels / Shorts
            </button>
            <button
              onClick={() => setAspect("16:9")}
              className={`focus-ring rounded-full border px-4 py-1.5 text-xs font-semibold ${
                aspect === "16:9" ? "border-gold bg-gold/10 text-gold-bright" : "border-white/10"
              }`}
            >
              16:9 — YouTube
            </button>
          </div>
        </section>

        <section className="rounded-2xl bg-white/[0.06] p-4">
          <h2 className="mb-3 font-display text-lg font-bold">الخلفية</h2>
          <div className="flex flex-wrap gap-2">
            {(["gradient", "color", "image", "video"] as BgKind[]).map((k) => (
              <button
                key={k}
                onClick={() => setBgKind(k)}
                className={`focus-ring rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  bgKind === k ? "border-gold bg-gold/10 text-gold-bright" : "border-white/10"
                }`}
              >
                {k === "gradient" ? "تدرّج جاهز" : k === "color" ? "لون واحد" : k === "image" ? "صورة" : "فيديو"}
              </button>
            ))}
          </div>

          {bgKind === "gradient" && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {GRADIENTS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGradientId(g.id)}
                  className={`focus-ring h-14 rounded-lg border-2 text-[10px] font-semibold text-white ${
                    gradientId === g.id ? "border-gold" : "border-transparent"
                  }`}
                  style={{ background: `linear-gradient(135deg, ${g.stops.join(",")})` }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}

          {bgKind === "color" && (
            <div className="mt-3">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-20 rounded" />
            </div>
          )}

          {bgKind === "image" && (
            <div className="mt-3">
              <FileDropInput
                accept="image/*"
                fileName={imageFileName}
                icon={<ImageIcon size={20} />}
                hint="لم يتم اختيار أي ملف — اضغط لرفع صورة من جهازك لاستخدامها كخلفية"
                onFile={(f) => {
                  setImageUrl(URL.createObjectURL(f));
                  setImageFileName(f.name);
                }}
              />
            </div>
          )}

          {bgKind === "video" && (
            <div className="mt-3">
              <FileDropInput
                accept="video/*"
                fileName={videoFileName}
                icon={<VideoIcon size={20} />}
                hint="لم يتم اختيار أي ملف — اضغط لرفع فيديو قصير من جهازك ليعمل كخلفية متحركة"
                onFile={(f) => {
                  setVideoUrl(URL.createObjectURL(f));
                  setVideoFileName(f.name);
                }}
              />
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white/[0.06] p-4">
          <h2 className="mb-3 font-display text-lg font-bold">شكل الآيات</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted-on-night)]">نوع الخط</span>
              <select
                value={fontKey}
                onChange={(e) => setFontKey(e.target.value as FontKey)}
                className="focus-ring w-full rounded-2xl bg-white/[0.06] px-3 py-2"
              >
                {(Object.keys(FONT_LABELS) as FontKey[]).map((k) => (
                  <option key={k} value={k}>
                    {FONT_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted-on-night)]">حجم الخط ({fontSize})</span>
              <input
                type="range"
                min={30}
                max={100}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-[var(--gold)]"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted-on-night)]">لون الخط</span>
              <input type="color" value={fontColor} onChange={(e) => setFontColor(e.target.value)} className="h-10 w-20 rounded" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted-on-night)]">مكان النص</span>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as TextPosition)}
                className="focus-ring w-full rounded-2xl bg-white/[0.06] px-3 py-2"
              >
                <option value="top">أعلى</option>
                <option value="center">منتصف</option>
                <option value="bottom">أسفل</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted-on-night)]">محاذاة النص</span>
              <select
                value={align}
                onChange={(e) => setAlign(e.target.value as TextAlign)}
                className="focus-ring w-full rounded-2xl bg-white/[0.06] px-3 py-2"
              >
                <option value="right">يمين</option>
                <option value="center">وسط</option>
                <option value="left">يسار</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted-on-night)]">عرض الآية</span>
              <select
                value={wrap}
                onChange={(e) => setWrap(e.target.value as WrapMode)}
                className="focus-ring w-full rounded-2xl bg-white/[0.06] px-3 py-2"
              >
                <option value="multi">عدّة أسطر</option>
                <option value="single">سطر واحد</option>
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-[var(--muted-on-night)]">شفافية الخلفية خلف النص ({bgOpacity}%)</span>
              <input
                type="range"
                min={0}
                max={90}
                value={bgOpacity}
                onChange={(e) => setBgOpacity(Number(e.target.value))}
                className="w-full accent-[var(--gold)]"
              />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={shadow} onChange={(e) => setShadow(e.target.checked)} className="accent-[var(--gold)]" />
              إطار وظل خفيف حول النص لتحسين وضوحه
            </label>
          </div>
        </section>

        <section className="rounded-2xl bg-white/[0.06] p-4">
          <h2 className="mb-3 font-display text-lg font-bold">معلومات إضافية على الفيديو</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showSurahName} onChange={(e) => setShowSurahName(e.target.checked)} className="accent-[var(--gold)]" />
              اسم السورة
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showAyahNumber} onChange={(e) => setShowAyahNumber(e.target.checked)} className="accent-[var(--gold)]" />
              رقم الآية
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showReciterName} onChange={(e) => setShowReciterName(e.target.checked)} className="accent-[var(--gold)]" />
              اسم القارئ
            </label>
          </div>
          <p className="mt-3 text-xs text-[var(--muted-on-night)]">
          </p>
        </section>
      </div>

      {/* -------- Preview + generate -------- */}
      <div className="order-1 lg:order-2 lg:sticky lg:top-6 h-fit space-y-4">
        <div
          className="mx-auto overflow-hidden rounded-2xl bg-white/[0.05] bg-black shadow-lg"
          style={{ width: "100%", maxWidth: aspect === "9:16" ? 300 : 420 }}
        >
          <canvas ref={canvasRef} className="block w-full" style={{ aspectRatio: aspect === "9:16" ? "9/16" : "16/9" }} />
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={togglePreview}
            disabled={!selectedAyahs.length || !!validation}
            className="focus-ring flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold hover:border-gold disabled:opacity-40"
          >
            {previewPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
            {previewPlaying ? "إيقاف المعاينة" : "تشغيل Preview"}
          </button>
        </div>
        <audio ref={previewAudioRef} onEnded={onPreviewEnded} className="hidden" />

        <button
          onClick={generateVideo}
          disabled={isGenerating || !selectedAyahs.length || !!validation}
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
        >
          <WandIcon size={18} />
          {isGenerating ? `جارٍ إنشاء الفيديو... ${Math.round(genProgress * 100)}%` : "إنشاء الفيديو"}
        </button>
        {isGenerating && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
            <div className="h-full bg-gold text-[#1a1407] transition-[width]" style={{ width: `${genProgress * 100}%` }} />
          </div>
        )}
        {genError && <p className="text-center text-xs text-gold-bright">{genError}</p>}

        {generatedUrl && (
          <div className="space-y-2 rounded-2xl bg-white/[0.06] p-3">
            <video src={generatedUrl} controls className="w-full rounded-lg" />
            {generatedDurationSec != null && <p className="text-center text-xs text-[var(--muted-on-night)]">مدة الفيديو: {Math.floor(generatedDurationSec / 60).toLocaleString("ar-EG")}:{String(generatedDurationSec % 60).padStart(2, "0")} دقيقة</p>}
            {hasNativeVideoSaver() ? (
              // A plain <a download> on a blob: URL is not reliable inside
              // the Capacitor Android WebView (see MainActivity's
              // DownloadListener comment — that only handles real http(s)
              // downloads, not in-memory blob: content). VideoSaverPlugin
              // writes the video straight into the device's Movies library
              // via MediaStore instead — a real, direct download with no
              // share sheet or destination prompt.
              <button
                type="button"
                onClick={saveVideoNatively}
                disabled={isDownloading}
                className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-bold text-[var(--ivory)] disabled:opacity-60"
              >
                <DownloadIcon size={16} />
                {isDownloading ? "جارٍ التنزيل..." : "تنزيل الفيديو"}
              </button>
            ) : (
              <a
                href={generatedUrl}
                download={downloadName}
                className="focus-ring flex items-center justify-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-bold text-[var(--ivory)]"
              >
                <DownloadIcon size={16} />
                تحميل الفيديو
              </a>
            )}
            {downloadSuccess && (
              <p className="text-center text-xs text-gold-bright">تم تنزيل الفيديو وحفظه على جهازك.</p>
            )}
            {downloadError && <p className="text-center text-xs text-gold-bright">{downloadError}</p>}
            <p className="text-center text-[11px] text-[var(--muted-on-night)]">
              الصيغة: WebM (تُشغَّل في المتصفح ومعظم منصات الرفع). 
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
