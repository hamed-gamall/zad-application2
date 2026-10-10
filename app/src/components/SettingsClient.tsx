"use client";

import { useEffect, useState } from "react";
import {
  applyAppSettings,
  getAppSettings,
  setAppSettings,
  DEFAULT_APP_SETTINGS,
  type AppFontId,
  type AppSettings,
  type AppThemeId,
} from "@/lib/storage";
import Link from "next/link";
import NotificationsSettings from "@/components/notifications/NotificationsSettings";

const THEMES: { id: AppThemeId; label: string; swatch: [string, string, string] }[] = [
  { id: "manuscript", label: "زاد — زمرد وذهب (الافتراضي)", swatch: ["#061512", "#0b2a22", "#c8a45a"] },
  { id: "night", label: "الليلي", swatch: ["#05070d", "#171b28", "#e6c15a"] },
  { id: "sahara", label: "الصحراء", swatch: ["#2b1c10", "#faf1de", "#d99a35"] },
  { id: "emerald", label: "الزمردي", swatch: ["#08201c", "#f2f8f4", "#0f6e57"] },
  { id: "andalusi", label: "الأندلسي", swatch: ["#0a1a2e", "#eef3f8", "#1a6f8f"] },
];

const FONTS: { id: AppFontId; label: string; sample: string }[] = [
  { id: "cairo", label: "القاهرة (افتراضي)", sample: "بسم الله الرحمن الرحيم" },
  { id: "amiri", label: "أميري", sample: "بسم الله الرحمن الرحيم" },
  { id: "tajawal", label: "تجوال", sample: "بسم الله الرحمن الرحيم" },
];

export default function SettingsClient() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  useEffect(() => {
    // localStorage read is client-only; hydrate after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(getAppSettings());
  }, []);

  function update(patch: Partial<AppSettings>) {
    const next = setAppSettings(patch);
    setSettings(next);
    applyAppSettings(next);
  }

  return (
    <div className="space-y-10 px-6 pb-6">
      <section className="relative overflow-hidden rounded-[28px] p-5" style={{ background: "linear-gradient(135deg,#0f3d36,#071e19)", boxShadow: "inset 0 0 0 1px rgba(227,201,135,.2)" }}>
        <p className="font-display text-xl text-gold-bright">بلا حساب، بلا إعلانات</p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--muted-on-night)]">كل ما تحفظه من مفضّلات وتقدّم قراءة وإعدادات يبقى على جهازك فقط ولا يُرسل إلى أي خادم.</p>
      </section>

      <section aria-labelledby="th">
        <h2 id="th" className="font-display mb-4 text-2xl text-[var(--ivory)]">المظهر</h2>
        <div className="h-scroll -mx-6">
          {THEMES.map((t) => (
            <button key={t.id} onClick={() => update({ theme: t.id })} aria-pressed={settings.theme === t.id} className={`pressable focus-ring w-32 rounded-[22px] p-3 text-start ${settings.theme === t.id ? "bg-gold/15 ring-2 ring-gold" : "bg-white/[0.05]"}`}>
              <span className="relative block h-16 overflow-hidden rounded-2xl" style={{ background: t.swatch[0] }}>
                <span className="absolute inset-x-2 bottom-2 h-6 rounded-lg" style={{ background: t.swatch[1] }} />
                <span className="absolute end-3 top-3 h-3 w-3 rounded-full" style={{ background: t.swatch[2] }} />
              </span>
              <span className="mt-2 block text-xs text-[var(--ivory)]">{t.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="fn">
        <h2 id="fn" className="font-display mb-4 text-2xl text-[var(--ivory)]">نوع الخط</h2>
        <div className="grid grid-cols-3 gap-2">
          {FONTS.map((f) => (
            <button key={f.id} onClick={() => update({ font: f.id })} aria-pressed={settings.font === f.id} className={`pressable focus-ring rounded-2xl p-3 text-center ${settings.font === f.id ? "bg-gold/15 ring-2 ring-gold" : "bg-white/[0.05]"}`}>
              <p className="text-lg text-[var(--ivory)]" style={{ fontFamily: f.id === "amiri" ? "var(--font-amiri), serif" : f.id === "tajawal" ? "var(--font-tajawal), sans-serif" : "var(--font-cairo), sans-serif" }}>بسم الله</p>
              <p className="mt-1 text-[11px] text-[var(--muted-on-night)]">{f.label}</p>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="fs">
        <h2 id="fs" className="font-display mb-4 text-2xl text-[var(--ivory)]">حجم الخط</h2>
        <input type="range" min={0.9} max={1.3} step={0.05} value={settings.fontScale} onChange={(e) => update({ fontScale: Number(e.target.value) })} className="w-full accent-[var(--gold)]" aria-label="حجم الخط" />
        <p className="mt-3 text-center text-[var(--muted-on-night)]" style={{ fontSize: `${settings.fontScale}rem` }}>هكذا سيبدو النص في التطبيق.</p>
      </section>

      <NotificationsSettings />

      <Link href="/about" className="pressable focus-ring flex items-center justify-between rounded-2xl bg-white/[0.05] px-5 py-4 text-[var(--ivory)]">عن زاد المسلم والتواصل<span aria-hidden>←</span></Link>
    </div>
  );
}
