"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { App } from "@capacitor/app";
import {
  applyAllNotificationSettings,
  rescheduleAthan,
  scheduleAzkarSabah,
  scheduleAzkarMasaa,
} from "@/lib/notifications/schedule";
import { getNotificationSettings } from "@/lib/notifications/settings";

/**
 * Mounted once in the root layout. On the native Android app it:
 *  - Applies the user's saved notification preferences (so a fresh install
 *    or an app restart always matches what's toggled in Settings).
 *  - Refreshes the Athan schedule on every foreground/resume, since prayer
 *    times drift by a few minutes day to day.
 *  - Listens for notification taps and deep-links straight to the right
 *    page (Azkar, Surah Al-Kahf, prayer times…), matching the requirement
 *    that these open directly rather than just landing on the home page.
 */
export default function NotificationsBootstrap() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeListener: (() => void) | undefined;

    (async () => {
      try {
        // Apply whatever the user already configured (idempotent).
        await applyAllNotificationSettings(getNotificationSettings());

        const sub = await LocalNotifications.addListener(
          "localNotificationActionPerformed",
          (action) => {
            const route = (action.notification.extra as { route?: string } | undefined)?.route;
            if (route) router.push(route);
          }
        );
        removeListener = () => sub.remove();
      } catch {
        // applyAllNotificationSettings already has its own top-level catch;
        // this outer one only guards addListener itself, so a bridge issue
        // here can't take down the whole app on launch either.
      }
    })();

    const resumeSub = App.addListener("resume", () => {
      rescheduleAthan();
      const settings = getNotificationSettings();
      if (settings.azkarSabahEnabled) scheduleAzkarSabah(true);
      if (settings.azkarMasaaEnabled) scheduleAzkarMasaa(true);
    });

    return () => {
      removeListener?.();
      resumeSub.then((s) => s.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
