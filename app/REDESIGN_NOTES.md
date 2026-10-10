# Zad Al Muslim — redesign notes (round 2)

Design: dark emerald + gold, illustrated backdrops (SceneArt / BeadsArt / ArchFrame), raised emblem dock.
Tokens: `src/app/globals.css` (every theme defines the full token set). Shared UI: `src/components/ui/`.

## Fixed in this round
- Pages too big / off-screen: `.prayer-glow` overflowed the viewport (page 396px on a 360px phone);
  added global width guards. Android: WebView textZoom locked to 100% (MainActivity).
- Themes: light themes now define all tokens (text, glass, atmosphere) → no more white-on-white.
- Mushaf page: edge-to-edge on paper background, no frame.
- Home "continue reading": real page thumbnail, honest empty state; progress saved only after real reading.
- Location: new `src/lib/location.ts` (+ `useUserLocation`) used by Prayer times, Qibla, Home, Adhan scheduler.
  GPS (native Capacitor Geolocation on Android) → IP fallback (labelled approximate) → typed city (saved).
  No more silent Mecca/Cairo fallback.
- Video generator: WebM duration stamped (fix-webm-duration), lead-in/tail, per-clip watchdog,
  duration shown; links removed from video and share image/captions; watermark visits 4 corners.
- Launcher/PWA icons zoomed (emblem fills the icon).

## Before release
- Deploy the web build to Vercel (the Android app loads https://zad-almuslim-app.vercel.app).
- Rebuild the APK (`@capacitor/geolocation` was added; run `npx cap sync android`, then Gradle) and test on a device:
  GPS prompt, Adhan alarms, background audio, video saving.
- Gradle build was NOT run here (sandbox has no access to Gradle/Google Maven).
- appId mismatch left as is: capacitor.config.ts `com.zadalmuslim.app` vs Gradle applicationId `com.zadalmuslim2079.app`.
