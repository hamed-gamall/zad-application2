"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  getNotificationSettings,
  setNotificationSettings,
  findMuezzin,
  MUEZZINS,
  PRAYER_LABELS,
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
  type PrayerKey,
  type SalawatFrequency,
} from "@/lib/notifications/settings";
import {
  ensurePermission,
  rescheduleAthan,
  scheduleSalawat,
  scheduleAzkarSabah,
  scheduleAzkarMasaa,
  requestExactAlarmPermission,
  checkExactAlarmPermission,
} from "@/lib/notifications/schedule";
import { CALCULATION_METHODS, MADHAB_OPTIONS, type CalculationMethodId, type MadhabId } from "@/lib/prayerMethods";
import { playPreview, stopPreview } from "@/lib/notifications/preview";
import { PlayIcon, PauseIcon } from "@/components/icons/Icons";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      // This toggle's real value only exists client-side (localStorage), so
      // in the rare case the app shell it hydrates against was cached from
      // a different settings state (see `dynamic = "force-dynamic"` on the
      // page above, which is the actual fix), don't let React treat that as
      // an error — just silently take the live value.
      suppressHydrationWarning
      className={`focus-ring relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? "bg-gold" : "bg-white/15"
      }`}
    >
      <span
        suppressHydrationWarning
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-0.5" : "translate-x-5"
        }`}
      />
    </button>
  );
}

const PRAYER_KEYS: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

function formatHour(h: number) {
  const period = h < 12 ? "ص" : "م";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${period}`;
}

export default function PrayerNotificationsSettings() {
  const [native, setNative] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [permissionDenied, setPermissionDenied] = useState(false);
  // Android 12+ only: an Athan had to fall back to an "inexact" alarm
  // because "Alarms & reminders" isn't granted, meaning it can now arrive
  // up to ~15 minutes late. Offers a button to reopen that OS permission
  // screen instead of leaving prayer times silently drifting.
  const [exactAlarmIssue, setExactAlarmIssue] = useState(false);
  // Which muezzin's preview is currently playing (if any), so a tap on the
  // same button can stop it and the UI never shows a sound as "playing"
  // after it has actually stopped.
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);

  useEffect(() => {
    const isNativeApp = Capacitor.isNativePlatform();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNative(isNativeApp);
     
    setSettings(getNotificationSettings());
    if (isNativeApp && getNotificationSettings().athanEnabled) {
      checkExactAlarmPermission().then((granted) => setExactAlarmIssue(!granted));
    }
  }, []);

  // Make sure no preview keeps playing after the settings screen unmounts.
  useEffect(() => {
    return () => stopPreview();
  }, []);

  function togglePreview(id: string, url: string) {
    if (playingPreviewId === id) {
      stopPreview();
      setPlayingPreviewId(null);
      return;
    }
    playPreview(url, () => {
      setPlayingPreviewId((current) => (current === id ? null : current));
    });
    setPlayingPreviewId(id);
  }

  async function update(patch: Partial<NotificationSettings>) {
    const next = setNotificationSettings(patch);
    setSettings(next);
    return next;
  }

  async function requestPermissionIfNeeded() {
    const granted = await ensurePermission();
    setPermissionDenied(!granted);
    return granted;
  }

  async function runRescheduleAthan() {
    const { hadExactAlarmFallback } = await rescheduleAthan();
    setExactAlarmIssue(hadExactAlarmFallback);
  }

  async function onFixExactAlarm() {
    const granted = await requestExactAlarmPermission();
    if (granted) {
      setExactAlarmIssue(false);
      await runRescheduleAthan();
    }
  }

  /**
   * The calculation method/madhab feed both the Athan schedule and the two
   * Azkar reminders (they fire at Fajr/Asr respectively — see
   * scheduleAzkarSabah/Masaa) — so all three are recomputed together
   * whenever either setting changes, or the on-screen times and the actual
   * notifications could quietly drift apart again.
   */
  async function onChangeMethod(patch: Partial<Pick<NotificationSettings, "calculationMethod" | "madhab">>) {
    const next = await update(patch);
    await Promise.all([
      runRescheduleAthan(),
      scheduleAzkarSabah(next.azkarSabahEnabled),
      scheduleAzkarMasaa(next.azkarMasaaEnabled),
    ]);
  }

  async function onToggleAthan(value: boolean) {
    // Turning the athan notification off shouldn't leave a preview sound
    // playing behind it.
    if (!value) {
      stopPreview();
      setPlayingPreviewId(null);
    }
    await update({ athanEnabled: value });
    if (value && !(await requestPermissionIfNeeded())) return;
    await runRescheduleAthan();
  }

  async function onChangeMode(mode: "same" | "perPrayer") {
    await update({ muezzinMode: mode });
    await runRescheduleAthan();
  }

  async function onPickSameMuezzin(id: string) {
    const next = await update({ muezzinSame: id as NotificationSettings["muezzinSame"] });
    togglePreview(id, findMuezzin(next.muezzinSame).previewUrl);
    await runRescheduleAthan();
  }

  async function onPickPerPrayerMuezzin(prayer: PrayerKey, id: string) {
    const next = await update({
      muezzinPerPrayer: { ...settings.muezzinPerPrayer, [prayer]: id as NotificationSettings["muezzinSame"] },
    });
    togglePreview(`${prayer}:${id}`, findMuezzin(next.muezzinPerPrayer[prayer]).previewUrl);
    await runRescheduleAthan();
  }

  async function onToggleSalawat(value: boolean) {
    await update({ salawatEnabled: value });
    if (value && !(await requestPermissionIfNeeded())) return;
    await scheduleSalawat(value, settings.salawatFrequencyHours);
  }

  async function onPickFrequency(h: SalawatFrequency) {
    const next = await update({ salawatFrequencyHours: h });
    await scheduleSalawat(next.salawatEnabled, h);
  }

  const salawatHours: number[] = [];
  for (let h = 0; h < 24; h += settings.salawatFrequencyHours) salawatHours.push(h);

  return (
    <section className="mt-2 rounded-[28px] glass p-5">
      <h2 className="font-display text-xl font-bold">تنبيهات الأذان والصلاة على النبي ﷺ</h2>

      {!native && (
        <p className="mt-2 rounded-lg bg-white/[0.06] px-3 py-2 text-sm text-[var(--muted-on-night)]">
          هذه التنبيهات تعمل فقط داخل تطبيق زَادُ المُسلِم على الهاتف.
        </p>
      )}
      {native && permissionDenied && (
        <p className="mt-2 rounded-lg bg-gold/10 px-3 py-2 text-sm text-gold-bright">
          لازم تسمح بالإشعارات من إعدادات الهاتف حتى تصلك هذه التنبيهات.
        </p>
      )}
      {native && exactAlarmIssue && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gold/10 px-3 py-2 text-sm text-gold-bright">
          <span>
            الهاتف يمنع التطبيق من ضبط أذان بتوقيت دقيق، فقد يتأخر الأذان بضع دقائق. فعّل إذن
            &quot;التنبيهات والمنبهات&quot; حتى يدخل في وقته تمامًا.
          </span>
          <button
            type="button"
            onClick={onFixExactAlarm}
            className="focus-ring shrink-0 rounded-full border border-gold/40 px-3 py-1 text-xs font-semibold hover:bg-gold/10"
          >
            فتح الإعدادات
          </button>
        </div>
      )}

      {/* طريقة حساب المواقيت — تتحكم في التوقيت الفعلي للأذان وأذكار الصباح/المساء أدناه */}
      <div className="mt-4 rounded-2xl bg-white/[0.06] p-4">
        <p className="text-sm font-semibold">طريقة حساب مواقيت الصلاة</p>
        <p className="mt-0.5 text-xs text-[var(--muted-on-night)]">
          تحدّد هذه الطريقة توقيت الأذان الفعلي (وأذكار الصباح/المساء)، وتتطابق دائمًا مع ما يظهر في صفحة
          &quot;مواقيت الصلاة&quot;.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-[var(--muted-on-night)]">
            طريقة الحساب
            <select
              value={settings.calculationMethod}
              onChange={(e) => onChangeMethod({ calculationMethod: e.target.value as CalculationMethodId })}
              className="focus-ring field !rounded-2xl !px-3 !py-2.5 text-sm"
            >
              {CALCULATION_METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--muted-on-night)]">
            المذهب (لوقت العصر)
            <select
              value={settings.madhab}
              onChange={(e) => onChangeMethod({ madhab: e.target.value as MadhabId })}
              className="focus-ring field !rounded-2xl !px-3 !py-2.5 text-sm"
            >
              {MADHAB_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* الأذان */}
      <div className="mt-4 rounded-2xl bg-white/[0.06] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">إشعار الأذان</p>
            <p className="mt-0.5 text-xs text-[var(--muted-on-night)]">صوت أذان حقيقي عند دخول كل وقت صلاة.</p>
          </div>
          <Toggle checked={settings.athanEnabled} onChange={onToggleAthan} />
        </div>

        {native && (
          <p className="mt-3 rounded-lg bg-gold/10 px-3 py-2 text-xs text-gold-bright">
            💡 لإسكات الأذان بسرعة أثناء تشغيله، اقلب الهاتف على وجهه.
          </p>
        )}

        {settings.athanEnabled && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onChangeMode("same")}
                className={`focus-ring rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  settings.muezzinMode === "same" ? "border-gold ring-1 ring-emerald text-gold-bright" : "border-white/10"
                }`}
              >
                نفس المؤذن لكل الصلوات
              </button>
              <button
                onClick={() => onChangeMode("perPrayer")}
                className={`focus-ring rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  settings.muezzinMode === "perPrayer" ? "border-gold ring-1 ring-emerald text-gold-bright" : "border-white/10"
                }`}
              >
                مؤذن مختلف لكل صلاة
              </button>
            </div>

            {settings.muezzinMode === "same" ? (
              <div>
                <p className="text-xs text-[var(--muted-on-night)]">
                  المؤذن المختار حاليًا: <span className="font-semibold text-gold-bright">{findMuezzin(settings.muezzinSame).label}</span>
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {MUEZZINS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => onPickSameMuezzin(m.id)}
                      className={`focus-ring flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                        settings.muezzinSame === m.id
                          ? "border-gold ring-1 ring-emerald text-gold-bright"
                          : "border-white/10 hover:border-gold"
                      }`}
                    >
                      <span>{m.label}</span>
                      {playingPreviewId === m.id ? (
                        <PauseIcon size={14} className="shrink-0" />
                      ) : (
                        <PlayIcon size={14} className="shrink-0 opacity-60" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {PRAYER_KEYS.map((prayer) => {
                  const isPlayingThis = playingPreviewId === `${prayer}:${settings.muezzinPerPrayer[prayer]}`;
                  return (
                    <div key={prayer} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.05] p-3">
                      <div>
                        <p className="text-sm font-semibold">{PRAYER_LABELS[prayer]}</p>
                        <p className="text-xs text-gold-bright">{findMuezzin(settings.muezzinPerPrayer[prayer]).label}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={isPlayingThis ? "إيقاف الاستماع" : "استماع للمؤذن"}
                          onClick={() =>
                            togglePreview(
                              `${prayer}:${settings.muezzinPerPrayer[prayer]}`,
                              findMuezzin(settings.muezzinPerPrayer[prayer]).previewUrl
                            )
                          }
                          className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-[var(--muted-on-night)] hover:border-gold hover:text-gold-bright"
                        >
                          {isPlayingThis ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
                        </button>
                        <select
                          value={settings.muezzinPerPrayer[prayer]}
                          onChange={(e) => onPickPerPrayerMuezzin(prayer, e.target.value)}
                          className="focus-ring rounded-2xl bg-white/[0.06] px-2 py-1.5 text-sm"
                        >
                          {MUEZZINS.map((m) => (
                            <option key={m.id} value={m.id}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* الصلاة على النبي ﷺ */}
      <div className="mt-4 rounded-2xl bg-white/[0.06] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">الصلاة على النبي ﷺ</p>
            <p className="mt-0.5 text-xs text-[var(--muted-on-night)]">تذكير صوتي دوري بالصلاة على النبي محمد ﷺ.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => togglePreview("salawat", "/audio/salawat.mp3")}
              aria-label="تجربة صوت التنبيه"
              className="focus-ring flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-gold-bright hover:border-gold"
            >
              {playingPreviewId === "salawat" ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
            </button>
            <Toggle checked={settings.salawatEnabled} onChange={onToggleSalawat} />
          </div>
        </div>

        {settings.salawatEnabled && (
          <div className="mt-4">
            <p className="text-xs text-[var(--muted-on-night)]">
              يصلك التذكير الآن:{" "}
              <span className="font-semibold text-gold-bright">
                {settings.salawatFrequencyHours === 1 ? "كل ساعة" : `كل ${settings.salawatFrequencyHours} ساعات`}
              </span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {([1, 2, 3, 4, 5] as SalawatFrequency[]).map((h) => (
                <button
                  key={h}
                  onClick={() => onPickFrequency(h)}
                  className={`focus-ring rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${
                    settings.salawatFrequencyHours === h
                      ? "border-gold ring-1 ring-emerald text-gold-bright"
                      : "border-white/10 hover:border-gold"
                  }`}
                >
                  {h === 1 ? "كل ساعة" : `كل ${h} ساعات`}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted-on-night)]">
              أوقات اليوم: {salawatHours.map(formatHour).join("، ")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
