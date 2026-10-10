import type { Metadata } from "next";
import PrayerTimesClient from "@/components/PrayerTimesClient";

export const metadata: Metadata = {
  title: "مواقيت الصلاة",
  description: "مواقيت الصلوات الخمس بحسب موقعك الحالي، محدثة لحظيًا عبر واجهة Aladhan.",
};

// This page is entirely personalized — geolocation-based prayer times, plus
// notification settings read straight from the device's localStorage — so
// it can never be meaningfully static in the first place. Forcing it
// dynamic stops Next.js from ever serving a stale prerendered/static shell
// for it, which is what was causing a hydration mismatch on the Athan
// toggle after navigating back to this page with notifications already
// turned on: the cached shell reflected the default (off) state while the
// live component already held the real (on) one.
export const dynamic = "force-dynamic";

export default function PrayerTimesPage() {
  return <PrayerTimesClient />;
}
