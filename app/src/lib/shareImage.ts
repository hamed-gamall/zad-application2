import { SITE_NAME } from "@/lib/site";
import { Capacitor } from "@capacitor/core";

const COLORS = {
  inkNight: "#061512",
  inkNight2: "#0b2a22",
  gold: "#c8a45a",
  goldBright: "#e3c987",
  textOnNight: "#f3ecd9",
  mutedOnNight: "#9db3aa",
};

const WIDTH = 1080;
const PADDING = 76;
const MAX_TEXT_WIDTH = WIDTH - PADDING * 2;

// Resolves the actual font-family the site uses for headings/Quran-style
// text (set via next/font as CSS variables) by reading it off a hidden
// element, so the canvas renders with the *same* font as the page rather
// than a hardcoded guess.
function resolveSiteFont(): string {
  if (typeof document === "undefined") return "serif";
  const probe = document.createElement("span");
  probe.className = "font-display";
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily || "serif";
  document.body.removeChild(probe);
  return family;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Renders `text` (a hadith, ayah, dhikr, dua — any shareable snippet) as a
 * branded PNG: the site's own font and palette, an optional small label
 * above the text (e.g. "صحيح البخاري — حديث رقم ١"), and a footer with the
 * site's icon, name, and link. Returns a Blob ready for download or the
 * Web Share API.
 */
export async function generateShareImage(text: string, label?: string): Promise<Blob> {
  await document.fonts.ready;
  const fontFamily = resolveSiteFont();

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas غير مدعوم");

  // --- measure pass (on a temp height, then redraw at the real height) ---
  const textFontSize = text.length > 220 ? 38 : text.length > 120 ? 44 : 52;
  const lineHeight = Math.round(textFontSize * 1.65);
  ctx.font = `500 ${textFontSize}px ${fontFamily}`;
  const lines = wrapText(ctx, text, MAX_TEXT_WIDTH);

  const labelHeight = label ? 56 : 0;
  const footerHeight = 230;
  const topOrnamentHeight = 56;
  const height =
    PADDING + topOrnamentHeight + labelHeight + lines.length * lineHeight + PADDING + footerHeight + PADDING;

  canvas.height = height;

  // --- background: emerald glow over near-black green, star watermark, gold frame ---
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, COLORS.inkNight2);
  bg.addColorStop(1, COLORS.inkNight);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, height);
  const glow = ctx.createRadialGradient(WIDTH * 0.8, 0, 0, WIDTH * 0.8, 0, WIDTH * 0.9);
  glow.addColorStop(0, "rgba(47,158,130,0.30)");
  glow.addColorStop(1, "rgba(47,158,130,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, height);

  // faint 12-point star watermark behind the text
  ctx.save();
  ctx.translate(WIDTH / 2, height / 2);
  ctx.strokeStyle = "rgba(227,201,135,0.07)";
  ctx.lineWidth = 2;
  for (const [r1, r2] of [[430, 300], [330, 230]]) {
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const r = i % 2 ? r2 : r1;
      const a = (Math.PI * i) / 12;
      ctx[i ? "lineTo" : "moveTo"](r * Math.cos(a), r * Math.sin(a));
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();

  // double hairline frame with diamond corners
  ctx.strokeStyle = "rgba(227,201,135,0.45)";
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, WIDTH - 48, height - 48);
  ctx.strokeStyle = "rgba(227,201,135,0.18)";
  ctx.strokeRect(38, 38, WIDTH - 76, height - 76);
  ctx.fillStyle = COLORS.goldBright;
  for (const [x, y] of [[24, 24], [WIDTH - 24, 24], [24, height - 24], [WIDTH - 24, height - 24]]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
  }

  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  let cursorY = PADDING + topOrnamentHeight;

  // top ornament: small centered gold diamond + rule
  const cx = WIDTH / 2;
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 130, PADDING + 18);
  ctx.lineTo(cx - 24, PADDING + 18);
  ctx.moveTo(cx + 24, PADDING + 18);
  ctx.lineTo(cx + 130, PADDING + 18);
  ctx.stroke();
  ctx.save();
  ctx.translate(cx, PADDING + 18);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(-8, -8, 16, 16);
  ctx.restore();

  // label (e.g. book/surah reference)
  if (label) {
    ctx.font = `700 30px ${fontFamily}`;
    ctx.fillStyle = COLORS.goldBright;
    ctx.fillText(label, cx, cursorY + 30, MAX_TEXT_WIDTH);
    cursorY += labelHeight;
  }

  // main text
  ctx.font = `500 ${textFontSize}px ${fontFamily}`;
  ctx.fillStyle = COLORS.textOnNight;
  for (const line of lines) {
    cursorY += lineHeight;
    ctx.fillText(line, cx, cursorY - lineHeight / 3, MAX_TEXT_WIDTH);
  }

  // --- footer ---
  const footerTop = height - PADDING - footerHeight;
  ctx.strokeStyle = "rgba(227,201,135,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PADDING, footerTop);
  ctx.lineTo(WIDTH - PADDING, footerTop);
  ctx.stroke();

  try {
    const logo = await loadImage("/icons/icon-192.png");
    const logoSize = 88;
    ctx.drawImage(logo, cx - logoSize / 2, footerTop + 28, logoSize, logoSize);
  } catch {
    /* logo optional — proceed without it if it fails to load */
  }

  ctx.font = `700 32px ${fontFamily}`;
  ctx.fillStyle = COLORS.goldBright;
  ctx.fillText(SITE_NAME, cx, footerTop + 160, WIDTH - PADDING * 2);

  ctx.direction = "ltr";
  ctx.font = `400 22px ${fontFamily}`;
  ctx.fillStyle = COLORS.mutedOnNight;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("تعذّر إنشاء الصورة"))), "image/png", 0.95);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // reader.result is "data:image/png;base64,AAAA..." — Filesystem.writeFile
      // wants the base64 payload only.
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * True only inside the Capacitor Android/iOS shell. The embedded WebView
 * there does not reliably support the Web Share API's file attachments
 * (`navigator.canShare({ files })` frequently reports false, or `share()`
 * silently drops the file and sends text only) even though the exact same
 * code works fine in a real mobile browser — which is why "مشاركة"/واتساب
 * looked like they were sharing *only text* from inside the app. Native
 * sharing goes through Android's own share sheet instead, which always
 * attaches the image correctly.
 */
export function canShareNatively() {
  return Capacitor.isNativePlatform();
}

/**
 * Shares an image blob using the native Android share sheet (via
 * @capacitor/filesystem + @capacitor/share) instead of the Web Share API.
 * Writes to the app's cache dir — call this right before sharing, not
 * proactively, since these files aren't cleaned up automatically.
 */
export async function shareImageNatively(blob: Blob, filename: string, title: string, text: string) {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");

  const base64 = await blobToBase64(blob);
  const write = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
  });

  await Share.share({
    title,
    text,
    files: [write.uri],
    dialogTitle: title,
  });
}
