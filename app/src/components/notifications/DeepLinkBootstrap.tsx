"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

/**
 * Mounted once in the root layout. On the native Android app it makes
 * "Deep Links: جوه التطبيق" real: any https://zad-almuslim-app.vercel.app/...
 * link tapped elsewhere on the device (WhatsApp, SMS, browser, notification
 * "share" targets, etc.) — or the custom `zadalmuslim://` scheme — opens the
 * matching in-app route instead of falling back to a browser tab.
 *
 * Two cases are handled:
 *  - Cold start: the app was launched *by* the link (getLaunchUrl).
 *  - Warm/resume: the app was already running when the link was tapped
 *    (the `appUrlOpen` event).
 */
export default function DeepLinkBootstrap() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    function routeFromUrl(raw: string) {
      try {
        const url = new URL(raw);
        // Accept both the https App Link and the zadalmuslim:// custom
        // scheme; either way we only care about the path + query/hash.
        const path = `${url.pathname}${url.search}${url.hash}` || "/";
        router.push(path);
      } catch {
        /* not a parseable URL — ignore */
      }
    }

    App.getLaunchUrl().then((res) => {
      if (res?.url) routeFromUrl(res.url);
    });

    const subPromise = App.addListener("appUrlOpen", (data) => {
      if (data?.url) routeFromUrl(data.url);
    });

    return () => {
      subPromise.then((sub) => sub.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
