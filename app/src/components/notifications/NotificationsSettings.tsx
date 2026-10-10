"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  getNotificationSettings,
  setNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
} from "@/lib/notifications/settings";
import {
  ensurePermission,
  scheduleAzkarMasaa,
  scheduleAzkarSabah,
  scheduleKahf,
} from "@/lib/notifications/schedule";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`focus-ring relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? "bg-gold" : "bg-white/15"
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-0.5" : "translate-x-5"
        }`}
      />
    </button>
  );
}

export default function NotificationsSettings() {
  const [native, setNative] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNative(Capacitor.isNativePlatform());
     
    setSettings(getNotificationSettings());
  }, []);

  async function toggle<K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) {
    const next = setNotificationSettings({ [key]: value } as Partial<NotificationSettings>);
    setSettings(next);

    if (value) {
      const granted = await ensurePermission();
      if (!granted) {
        setPermissionDenied(true);
        return;
      }
      setPermissionDenied(false);
    }

    if (key === "azkarSabahEnabled") await scheduleAzkarSabah(Boolean(value));
    if (key === "azkarMasaaEnabled") await scheduleAzkarMasaa(Boolean(value));
    if (key === "kahfEnabled") await scheduleKahf(Boolean(value));
  }

  const rows: { key: keyof NotificationSettings; title: string; desc: string }[] = [
    { key: "azkarSabahEnabled", title: "أذكار الصباح", desc: "يفتح صفحة أذكار الصباح مباشرة." },
    { key: "azkarMasaaEnabled", title: "أذكار المساء", desc: "يفتح صفحة أذكار المساء مباشرة." },
    { key: "kahfEnabled", title: "سورة الكهف (كل جمعة)", desc: "يفتح سورة الكهف مباشرة صباح كل جمعة." },
  ];

  return (
    <section>
      <h2 className="font-display text-2xl">التنبيهات والإشعارات</h2>

      {!native && (
        <p className="mt-2 rounded-lg bg-white/[0.06] px-3 py-2 text-sm text-[var(--muted-on-night)]">
          تنبيهات الأذان والصلاة على النبي ﷺ موجودة الآن في صفحة{" "}
          <a href="/tools/prayer-times" className="underline hover:text-gold">مواقيت الصلاة</a>.
        </p>
      )}

      {native && permissionDenied && (
        <p className="mt-2 rounded-lg bg-gold/10 px-3 py-2 text-sm text-gold-bright">
          لازم تسمح بالإشعارات من إعدادات الهاتف حتى تصلك هذه التنبيهات.
        </p>
      )}

      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div
            key={r.key}
            className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.05] p-4"
          >
            <div>
              <p className="text-sm font-semibold">{r.title}</p>
              <p className="mt-0.5 text-xs text-[var(--muted-on-night)]">{r.desc}</p>
            </div>
            <Toggle
              checked={Boolean(settings[r.key])}
              onChange={(v) => toggle(r.key, v as NotificationSettings[typeof r.key])}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
