import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.zadalmuslim.app",
  appName: "زاد المسلم",
  webDir: "www",

  // The app is a full Next.js site (server-rendered pages + API routes)
  // already live on Vercel. Rather than re-implement it as a static
  // bundle (which would break /api/search, /api/daily-content,
  // /api/contact, /api/quran, and every server-rendered route), the
  // native shell loads the real production site directly. Capacitor's
  // native bridge (LocalNotifications, App, etc.) is injected into this
  // WebView exactly as it would be for local content, so every feature
  // — including the notification system — works unchanged.
  server: {
    url: "https://zad-almuslim-app.vercel.app",
    androidScheme: "https",
    cleartext: false,
    allowNavigation: [
      "zad-almuslim-app.vercel.app",
      "*.vercel.app",
      "api.aladhan.com",
      "mp3quran.net",
      "*.mp3quran.net",
      "cdn.islamic.network",
    ],
  },

  android: {
    allowMixedContent: false,
  },

  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_notify",
      iconColor: "#C8A45A",
      // No global default `sound` here on purpose: an earlier version set
      // sound: "beep.wav", but no such file exists anywhere in
      // android/app/src/main/res/raw — only athan_*.mp3 and
      // salawat_alan_nabi.mp3 do. Android resolves that missing resource
      // (getIdentifier() returns 0) the moment ANY notification/channel is
      // built, regardless of whether that specific notification's channel
      // even wanted a sound — which is what made the app crash the instant
      // Athan notifications were turned on. Every channel that needs a
      // sound already sets its own valid one directly in schedule.ts
      // (ensureChannels); channels with no sound (the athan-* ones) rely on
      // the native Athan foreground service for actual audio instead.
    },
  },
};

export default config;
