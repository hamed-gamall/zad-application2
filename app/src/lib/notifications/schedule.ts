"use client";

import { Capacitor } from "@capacitor/core";
import {
  LocalNotifications,
  Weekday,
  type Channel,
  type ScheduleOptions,
} from "@capacitor/local-notifications";
import { computePrayerTimesRange } from "./prayerCalc";
import {
  findMuezzin,
  getNotificationSettings,
  setNotificationSettings,
  MUEZZINS,
  PRAYER_LABELS,
  type NotificationSettings,
  type PrayerKey,
} from "./settings";
import NativeAthanScheduler, { hasNativeAthanPlayback, type NativeAthanItem } from "./nativeAthanPlayback";

// A single, shared gold tone for the "reminder" notifications (Azkar
// morning/evening + Friday Al-Kahf) so they read as one visual family,
// distinct from the Athan / Salawat ones.
const REMINDER_ICON_COLOR = "#C9A227";
const ATHAN_ICON_COLOR = "#0F5C4C";
// Shown on the right side of the expanded notification, alongside the small
// status-bar icon + app name that Android already adds automatically.
const LARGE_ICON = "ic_notify_large";

const ID = {
  ATHAN_BASE: 1000, // 1000..1349 — 5 prayers x up to 70 days ahead
  SALAWAT_BASE: 2000, // 2000..2023 — one slot per hour of the day, at most
  AZKAR_SABAH_BASE: 3000, // 3000..3069 — one per day, at that day's Fajr
  AZKAR_MASAA_BASE: 3100, // 3100..3169 — one per day, at that day's Asr
  KAHF: 4000,
};

// IMPORTANT — do not raise these back up without re-reading this note.
//
// Android's AlarmManager silently enforces a hard per-app cap of 500
// concurrently-registered alarms (AlarmManagerService.MAX_ALARMS_PER_UID in
// AOSP) — going over it doesn't degrade gracefully, it makes the very next
// `setExact*()`/`set*()` call throw an uncaught IllegalStateException
// ("Too many alarms (500) registered for uid ..."), which crashes the app
// outright. A previous version of this file scheduled 70 days ahead, which
// on its own (70 days x 5 prayers) already asks for 350 alarms — and Athan
// registers TWO independent alarms per occurrence (the capacitor
// local-notification banner below, AND a separate native AlarmManager entry
// in AthanScheduler.java that drives the actual audio — see
// nativeAthanPlayback.ts), so it was really requesting up to 700 alarms
// from Athan alone, before Azkar/Salawat/Kahf are even added. That is what
// made the app crash the moment Athan notifications were turned on, and
// crash again on every subsequent launch (NotificationsBootstrap re-applies
// saved settings on every app start) until Athan was switched back off.
//
// The fix is a much smaller scheduling horizon, kept small on purpose and
// topped back up automatically and often: on every app open/resume
// (NotificationsBootstrap's `resume` listener), on every settings change,
// and — for Athan specifically — re-armed after every reboot
// (AthanBootReceiver). A real person opens their phone many times a day, so
// a short rolling window never actually runs dry in practice; it just stays
// comfortably, permanently under the OS limit instead of hoping the limit
// never gets hit.
const AZKAR_DAYS_AHEAD = 5;
const ATHAN_DAYS_AHEAD = 5;

function isNative() {
  return Capacitor.isNativePlatform();
}

export async function ensurePermission(): Promise<boolean> {
  if (!isNative()) return false;
  const current = await LocalNotifications.checkPermissions();
  if (current.display === "granted") return true;
  const req = await LocalNotifications.requestPermissions();
  return req.display === "granted";
}

let channelsReady = false;
export async function ensureChannels(force = false) {
  if (!isNative()) return;
  if (channelsReady && !force) return;
  const channels: Channel[] = [
    {
      id: "salawat",
      name: "الصلاة على النبي ﷺ",
      description: "تذكير بالصلاة على النبي محمد ﷺ حسب المدة التي اخترتها",
      sound: "salawat_alan_nabi",
      importance: 5 as Channel["importance"],
      visibility: 1 as Channel["visibility"],
    },
    {
      id: "azkar",
      name: "الأذكار والتذكيرات",
      description: "أذكار الصباح والمساء وسورة الكهف يوم الجمعة",
      importance: 5 as Channel["importance"],
      visibility: 1 as Channel["visibility"],
    },
    ...MUEZZINS.map((m) => ({
      id: `athan-${m.id}`,
      name: `الأذان — ${m.label}`,
      description: "تنبيه دخول وقت الصلاة",
      // Deliberately no `sound` here: this channel now only shows the
      // visible "حان الآن وقت صلاة..." banner. The actual, full-length
      // Athan recording is played separately by the native AthanScheduler/
      // AthanPlaybackService below — a real foreground-service media
      // playback that keeps going through screen locks and app switches
      // until it finishes or the person taps "إيقاف الأذان", instead of the
      // few-second clip a notification-channel sound gets cut down to.
      importance: 5 as Channel["importance"],
      visibility: 1 as Channel["visibility"],
    })),
  ];
  for (const ch of channels) {
    // Android locks a channel's sound/importance the moment it's first
    // created — silently swallowing "already exists" here (as before) meant
    // anyone who had the app installed before this channel's audio file
    // shipped was stuck on a silent/default channel forever, with no way to
    // fix it short of reinstalling. Deleting first guarantees the channel
    // always reflects the current settings (Android recreates it cleanly;
    // this does not touch the user's per-channel notification toggle, which
    // Android remembers by channel *id*, kept stable here).
    try {
      await LocalNotifications.deleteChannel({ id: ch.id });
    } catch {
      /* channel didn't exist yet — fine */
    }
    try {
      await LocalNotifications.createChannel(ch);
    } catch {
      /* creation failed — next call to ensureChannels will retry */
    }
  }
  channelsReady = true;
}

/** Call once after an app update so channel definitions (e.g. a newly added
 * muezzin sound file) reach devices that installed the app before this
 * version existed. Safe to call every launch — it's a no-op after the first
 * successful run this session beyond the explicit `force` recreation. */
export async function refreshChannelsOnce() {
  if (!isNative()) return;
  await ensureChannels(true);
}

async function tryGetCoords(): Promise<{ lat: number; lon: number } | null> {
  try {
    const { getSavedLocation, detectLocation } = await import("../location");
    const saved = getSavedLocation();
    if (saved && (saved.source === "manual" || Date.now() - saved.at < 60 * 60 * 1000)) return { lat: saved.lat, lon: saved.lon };
    const l = await detectLocation();
    return { lat: l.lat, lon: l.lon };
  } catch {
    return null;
  }
}

/** Same coordinates (with the same Cairo fallback) that power the Athan
 * schedule and the in-app "أذكار الصباح/المساء" banner's Fajr/Asr window —
 * shared so a notification and what the app shows when tapped never drift
 * apart because one used GPS and the other used the fallback. */
async function getSchedulingCoords(settings: NotificationSettings): Promise<{ lat: number; lon: number }> {
  let coords = settings.lastCoords;
  const fresh = await tryGetCoords();
  if (fresh) {
    coords = fresh;
    setNotificationSettings({ lastCoords: fresh });
  }
  if (!coords) {
    // Fallback: Cairo, Egypt — better an approximate time than none.
    coords = { lat: 30.0444, lon: 31.2357 };
  }
  return coords;
}

async function cancelIds(ids: number[]) {
  if (!ids.length) return;
  try {
    await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
  } catch {
    /* nothing scheduled with these ids — ignore */
  }
}

const PRAYER_KEYS: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

/** (Re)schedules the next few days of Athan notifications. Call this on
 * every app launch/resume so the times stay accurate as they drift daily —
 * the computation itself is fully offline (adhan.js), only geolocation
 * needs a one-time device fix, cached afterwards. */
export async function rescheduleAthan(): Promise<{ hadExactAlarmFallback: boolean }> {
  if (!isNative()) return { hadExactAlarmFallback: false };
  try {
    return await rescheduleAthanInner();
  } catch {
    // Top-level safety net for this function specifically: it's called
    // directly (not just via applyAllNotificationSettings) from the
    // settings screen the instant Athan is toggled on, so it must never be
    // able to crash the app on its own even if something upstream (GPS,
    // prayer-time math, the plugin bridge) throws.
    return { hadExactAlarmFallback: false };
  }
}

async function rescheduleAthanInner(): Promise<{ hadExactAlarmFallback: boolean }> {
  const settings = getNotificationSettings();

  // Always clear the previous window first.
  const oldIds = Array.from({ length: 350 }, (_, i) => ID.ATHAN_BASE + i);
  await cancelIds(oldIds);

  if (!settings.athanEnabled) {
    if (hasNativeAthanPlayback()) {
      await NativeAthanScheduler.cancel().catch(() => {});
    }
    return { hadExactAlarmFallback: false };
  }
  await ensurePermission();
  await ensureChannels();

  const coords = await getSchedulingCoords(settings);
  const days = computePrayerTimesRange(coords.lat, coords.lon, ATHAN_DAYS_AHEAD, settings.calculationMethod, settings.madhab);
  const now = Date.now();

  function muezzinFor(prayer: PrayerKey) {
    const id = settings.muezzinMode === "perPrayer" ? settings.muezzinPerPrayer[prayer] : settings.muezzinSame;
    return findMuezzin(id);
  }

  const notifications: ScheduleOptions["notifications"] = [];
  const nativeItems: NativeAthanItem[] = [];
  days.forEach((day, dayIdx) => {
    PRAYER_KEYS.forEach((key, prayerIdx) => {
      const at = day[key];
      if (at.getTime() <= now) return; // don't schedule times already past
      const muezzin = muezzinFor(key);
      const id = ID.ATHAN_BASE + dayIdx * 5 + prayerIdx;
      notifications.push({
        id,
        title: `حان الآن وقت صلاة ${PRAYER_LABELS[key]}`,
        body: "الله أكبر، الله أكبر — حي على الصلاة، حي على الفلاح.",
        channelId: `athan-${muezzin.id}`,
        iconColor: ATHAN_ICON_COLOR,
        largeIcon: LARGE_ICON,
        extra: { route: "/tools/prayer-times" },
        schedule: { at, allowWhileIdle: true },
      });
      nativeItems.push({
        id,
        atMillis: at.getTime(),
        muezzinRaw: muezzin.file,
        label: PRAYER_LABELS[key],
      });
    });
  });

  // Native side plays the actual full Athan recording via a foreground
  // service (keeps going through screen locks/app switches until it
  // finishes or the person taps stop); safe to fire-and-forget alongside
  // the visible banner scheduled below.
  if (hasNativeAthanPlayback()) {
    NativeAthanScheduler.schedule({ items: nativeItems }).catch(() => {});
  }

  if (notifications.length) {
    try {
      const result = await LocalNotifications.schedule({ notifications });
      // If any Athan alarm had to fall back to "inexact" because the OS's
      // "Alarms & reminders" permission isn't granted, the plugin already
      // opened that settings screen once during schedule() — but if the
      // person dismissed it, an Athan can now arrive up to ~15 minutes late,
      // which defeats the point of a prayer-time alert. Returning this lets
      // the settings screen offer a button to reopen that OS prompt.
      return { hadExactAlarmFallback: Boolean(result.warning) };
    } catch {
      // Defense in depth: never let a native scheduling failure (of any
      // kind — OS alarm quota, OEM restriction, plugin bug) bubble up as an
      // unhandled rejection and take the app down with it. The visible
      // banner for this window just won't appear; the native Athan audio
      // scheduled just above is unaffected, and everything is retried
      // automatically next app open.
      return { hadExactAlarmFallback: false };
    }
  }
  return { hadExactAlarmFallback: false };
}

/** Re-opens the OS "Alarms & reminders" screen so the person can grant exact
 * scheduling. Safe to call proactively (e.g. right when Athan is enabled) —
 * on Android < 12 this just resolves as already granted, no screen shown. */
export async function requestExactAlarmPermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const res = await LocalNotifications.changeExactNotificationSetting();
    return res.exact_alarm === "granted";
  } catch {
    return false;
  }
}

export async function checkExactAlarmPermission(): Promise<boolean> {
  if (!isNative()) return true;
  try {
    const res = await LocalNotifications.checkExactNotificationSetting();
    return res.exact_alarm === "granted";
  } catch {
    return true;
  }
}

export async function scheduleSalawat(enabled: boolean, frequencyHours: number = 1) {
  if (!isNative()) return;
  try {
    await scheduleSalawatInner(enabled, frequencyHours);
  } catch {
    // Called directly from the settings screen on every toggle — must
    // never crash the app on its own (see rescheduleAthan's catch above).
  }
}

async function scheduleSalawatInner(enabled: boolean, frequencyHours: number) {
  const allSlots = Array.from({ length: 24 }, (_, h) => ID.SALAWAT_BASE + h);
  await cancelIds(allSlots);
  if (!enabled) return;
  await ensurePermission();
  await ensureChannels();

  const hours: number[] = [];
  for (let h = 0; h < 24; h += frequencyHours) hours.push(h);

  await LocalNotifications.schedule({
    notifications: hours.map((h) => ({
      id: ID.SALAWAT_BASE + h,
      title: "اللهم صلِّ على محمد ﷺ",
      body: "خذ لحظة الآن وصلِّ على النبي محمد ﷺ.",
      channelId: "salawat",
      largeIcon: LARGE_ICON,
      extra: { route: "/" },
      schedule: { on: { hour: h, minute: 0 }, allowWhileIdle: true },
    })),
  }).catch(() => {
    // See rescheduleAthan's catch above: never let this crash the app.
  });
}

export async function scheduleAzkarSabah(enabled: boolean) {
  if (!isNative()) return;
  try {
    await scheduleAzkarSabahInner(enabled);
  } catch {
    // Called directly from the settings screen on every toggle — must
    // never crash the app on its own (see rescheduleAthan's catch above).
  }
}

async function scheduleAzkarSabahInner(enabled: boolean) {
  const oldIds = Array.from({ length: AZKAR_DAYS_AHEAD }, (_, i) => ID.AZKAR_SABAH_BASE + i);
  await cancelIds(oldIds);
  if (!enabled) return;
  await ensurePermission();
  await ensureChannels();

  const settings = getNotificationSettings();
  const coords = await getSchedulingCoords(settings);
  const days = computePrayerTimesRange(coords.lat, coords.lon, AZKAR_DAYS_AHEAD, settings.calculationMethod, settings.madhab);
  const now = Date.now();

  // Fires at Fajr — the exact start of the "أذكار الصباح" window the in-app
  // banner (DailyAdhkarBanner) uses, instead of a fixed 5:30 clock time that
  // can land well before or after actual sunrise depending on season/city.
  const notifications: ScheduleOptions["notifications"] = [];
  days.forEach((day, i) => {
    if (day.fajr.getTime() <= now) return;
    notifications.push({
      id: ID.AZKAR_SABAH_BASE + i,
      title: "أذكار الصباح",
      body: "ابدأ يومك بذكر الله — اضغط لقراءة أذكار الصباح.",
      channelId: "azkar",
      iconColor: REMINDER_ICON_COLOR,
      largeIcon: LARGE_ICON,
      extra: { route: "/azkar/1" },
      schedule: { at: day.fajr, allowWhileIdle: true },
    });
  });
  if (notifications.length) {
    await LocalNotifications.schedule({ notifications }).catch(() => {
      // See rescheduleAthan's catch above: never let this crash the app.
    });
  }
}

export async function scheduleAzkarMasaa(enabled: boolean) {
  if (!isNative()) return;
  try {
    await scheduleAzkarMasaaInner(enabled);
  } catch {
    // Called directly from the settings screen on every toggle — must
    // never crash the app on its own (see rescheduleAthan's catch above).
  }
}

async function scheduleAzkarMasaaInner(enabled: boolean) {
  const oldIds = Array.from({ length: AZKAR_DAYS_AHEAD }, (_, i) => ID.AZKAR_MASAA_BASE + i);
  await cancelIds(oldIds);
  if (!enabled) return;
  await ensurePermission();
  await ensureChannels();

  const settings = getNotificationSettings();
  const coords = await getSchedulingCoords(settings);
  const days = computePrayerTimesRange(coords.lat, coords.lon, AZKAR_DAYS_AHEAD, settings.calculationMethod, settings.madhab);
  const now = Date.now();

  // Fires at Asr — the exact start of the "أذكار المساء" window in the
  // in-app banner, instead of a fixed 17:00 that can land after Maghrib
  // in winter (when the window has already closed) or well before Asr in
  // summer.
  const notifications: ScheduleOptions["notifications"] = [];
  days.forEach((day, i) => {
    if (day.asr.getTime() <= now) return;
    notifications.push({
      id: ID.AZKAR_MASAA_BASE + i,
      title: "أذكار المساء",
      body: "لا تنسَ أذكار المساء — اضغط لقراءتها الآن.",
      channelId: "azkar",
      iconColor: REMINDER_ICON_COLOR,
      largeIcon: LARGE_ICON,
      extra: { route: "/azkar/1" },
      schedule: { at: day.asr, allowWhileIdle: true },
    });
  });
  if (notifications.length) {
    await LocalNotifications.schedule({ notifications }).catch(() => {
      // See rescheduleAthan's catch above: never let this crash the app.
    });
  }
}

export async function scheduleKahf(enabled: boolean) {
  if (!isNative()) return;
  try {
    await scheduleKahfInner(enabled);
  } catch {
    // Called directly from the settings screen on every toggle — must
    // never crash the app on its own (see rescheduleAthan's catch above).
  }
}

async function scheduleKahfInner(enabled: boolean) {
  await cancelIds([ID.KAHF]);
  if (!enabled) return;
  await ensurePermission();
  await ensureChannels();
  await LocalNotifications.schedule({
    notifications: [
      {
        id: ID.KAHF,
        title: "سورة الكهف",
        body: "اليوم الجمعة — اضغط لقراءة سورة الكهف.",
        channelId: "azkar",
        iconColor: REMINDER_ICON_COLOR,
        largeIcon: LARGE_ICON,
        extra: { route: "/quran/18" },
        schedule: { on: { weekday: Weekday.Friday, hour: 6, minute: 0 }, allowWhileIdle: true },
      },
    ],
  }).catch(() => {
    // See rescheduleAthan's catch above: never let this crash the app.
  });
}

/** Applies every toggle in `settings` to the OS scheduler. Safe to call
 * repeatedly (e.g. right after the user flips a switch, or on app launch). */
export async function applyAllNotificationSettings(settings: NotificationSettings) {
  if (!isNative()) return;
  try {
    await ensurePermission();
    await ensureChannels();
    await Promise.all([
      rescheduleAthan(),
      scheduleSalawat(settings.salawatEnabled, settings.salawatFrequencyHours),
      scheduleAzkarSabah(settings.azkarSabahEnabled),
      scheduleAzkarMasaa(settings.azkarMasaaEnabled),
      scheduleKahf(settings.kahfEnabled),
    ]);
  } catch {
    // Top-level safety net: every individual scheduling call above already
    // catches its own failures, but this guarantees that absolutely nothing
    // thrown while (re)applying notification settings — on every single app
    // launch, via NotificationsBootstrap — can ever crash or blank-screen
    // the app. Worst case, this run's scheduling is skipped and retried
    // automatically the next time the app opens or a setting changes.
  }
}
