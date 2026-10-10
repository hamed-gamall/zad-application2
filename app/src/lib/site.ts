export const SITE_NAME = "زَادُ المُسْلِم";
export const SITE_URL = "https://zad-almuslim-app.vercel.app";
// Shown on shared images without the protocol, since that reads cleaner.
export const SITE_URL_DISPLAY = SITE_URL.replace(/^https?:\/\//, "");

// The link watermarked onto generated share images/videos and appended to
// WhatsApp/copy captions (ayah/hadith/dua "of the day", the hadith/azkar/dua
// pages, the Quran-ayah share bar, and the Quran video generator). Kept
// deliberately separate from SITE_URL above — SITE_URL is the app's real
// canonical address and stays wired into SEO metadata, the sitemap/robots
// routes, and native deep-linking, none of which this link swap should
// touch.
export const SHARE_URL = "https://zadal-muslim.vercel.app";
export const SHARE_URL_DISPLAY = SHARE_URL.replace(/^https?:\/\//, "");
