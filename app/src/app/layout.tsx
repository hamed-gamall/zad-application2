import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { Amiri, Amiri_Quran, Cairo, Tajawal } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import AppMenu from "@/components/AppMenu";
import FloatingDock from "@/components/FloatingDock";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import Splash from "@/components/Splash";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import AudioPlayerProvider from "@/components/audio/AudioPlayerProvider";
import MiniPlayerBar from "@/components/audio/MiniPlayerBar";
import NotificationsBootstrap from "@/components/notifications/NotificationsBootstrap";
import DeepLinkBootstrap from "@/components/notifications/DeepLinkBootstrap";

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const amiriQuran = Amiri_Quran({
  variable: "--font-amiri-quran",
  subsets: ["arabic"],
  weight: "400",
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
});


// Runs before paint to read the saved theme/font/size from localStorage and
// apply them to <html> immediately, so there is no flash of the default theme.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var raw = localStorage.getItem("zad:app-settings");
    var s = raw ? JSON.parse(raw) : {};
    var theme = s.theme || "manuscript";
    var font = s.font || "cairo";
    var scale = s.fontScale || 1;
    var root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-font", font);
    root.style.setProperty("--app-font-scale", String(scale));
  } catch (e) {}
})();
`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "زَادُ المُسْلِم — رفيقك في القرآن والسنة والذكر",
    template: "%s | زَادُ المُسْلِم",
  },
  description:
    "منصة إسلامية شاملة: القرآن الكريم بالتلاوة والتفسير، الحديث الشريف من تسعة كتب، الأذكار والأدعية المأثورة، مواقيت الصلاة، اتجاه القبلة، والسبحة الإلكترونية.",
  openGraph: {
    title: "زَادُ المُسْلِم",
    description:
      "رفيقك اليومي في القرآن والسنة والذكر — قرآن، حديث، أذكار، أدعية، ومواقيت صلاة.",
    locale: "ar_AR",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-180.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "زَادُ المُسْلِم",
  },
};

export const viewport = {
  themeColor: "#061512",
  // Lets the page draw edge-to-edge (under the status bar / notch / gesture
  // bar) on the Android app shell, which now runs with
  // WindowCompat.setDecorFitsSystemWindows(false). Paired with the
  // safe-area-inset padding in globals.css so real content still starts
  // below the status bar instead of being hidden under it.
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${amiri.variable} ${amiriQuran.variable} ${cairo.variable} ${tajawal.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col text-[var(--text-on-parchment)]">
        {/* Google tag (gtag.js) — site analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-YW69GC0LE3"
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-YW69GC0LE3');
          `}
        </Script>
        <ServiceWorkerRegister />
        <NotificationsBootstrap />
        <DeepLinkBootstrap />
        <AudioPlayerProvider>
          <AtmosphericBackground />
          <Splash />
          <AppMenu />
          <main className="flex-1 pb-32">{children}</main>
          <FloatingDock />
          <MiniPlayerBar />
        </AudioPlayerProvider>
      </body>
    </html>
  );
}
