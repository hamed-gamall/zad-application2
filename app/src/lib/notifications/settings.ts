// Local-only persistence for notification preferences. Mirrors the pattern
// used in `src/lib/storage.ts` — everything is defensive about SSR/storage
// errors, nothing ever leaves the device.

import type { CalculationMethodId, MadhabId } from "@/lib/prayerMethods";

export type MuezzinId =
  | "makkah"
  | "mishary"
  | "abdulbasit"
  | "menshawy"
  | "alqatami"
  | "ahmadnuaina"
  | "malekchebae"
  | "hamaddeghreri"
  | "ibrahimalarkani"
  | "majedalhamathani"
  | "mansoorazzahrani"
  | "mohammadref3at"
  | "nasreddintobar"
  | "nasreddintobarfajr"
  | "mohammedqassas";

export const MUEZZINS: { id: MuezzinId; label: string; file: string; previewUrl: string }[] = [
  { id: "makkah", label: "الحرم المكي", file: "athan_makkah", previewUrl: "/audio/athan/makkah.mp3" },
  { id: "mishary", label: "مشاري العفاسي", file: "athan_mishary", previewUrl: "/audio/athan/mishary.mp3" },
  { id: "abdulbasit", label: "عبد الباسط عبد الصمد", file: "athan_abdulbasit", previewUrl: "/audio/athan/abdulbasit.mp3" },
  { id: "menshawy", label: "محمد المنشاوي", file: "athan_menshawy", previewUrl: "/audio/athan/menshawy.mp3" },
  { id: "alqatami", label: "ناصر القطامي", file: "athan_alqatami", previewUrl: "/audio/athan/alqatami.mp3" },
  { id: "ahmadnuaina", label: "أحمد نعينع", file: "athan_ahmadnuaina", previewUrl: "/audio/athan/ahmadnuaina.mp3" },
  { id: "malekchebae", label: "مالك شبيع (الفجر)", file: "athan_malekchebae", previewUrl: "/audio/athan/malekchebae.mp3" },
  { id: "hamaddeghreri", label: "حمد دغريري", file: "athan_hamaddeghreri", previewUrl: "/audio/athan/hamaddeghreri.mp3" },
  { id: "ibrahimalarkani", label: "إبراهيم الأركاني", file: "athan_ibrahimalarkani", previewUrl: "/audio/athan/ibrahimalarkani.mp3" },
  { id: "majedalhamathani", label: "ماجد الهمذاني", file: "athan_majedalhamathani", previewUrl: "/audio/athan/majedalhamathani.mp3" },
  { id: "mansoorazzahrani", label: "منصور الزهراني", file: "athan_mansoorazzahrani", previewUrl: "/audio/athan/mansoorazzahrani.mp3" },
  { id: "mohammadref3at", label: "محمد رفعت", file: "athan_mohammadref3at", previewUrl: "/audio/athan/mohammadref3at.mp3" },
  { id: "nasreddintobar", label: "نصر الدين طوبار", file: "athan_nasreddintobar", previewUrl: "/audio/athan/nasreddintobar.mp3" },
  {
    id: "nasreddintobarfajr",
    label: "نصر الدين طوبار (الفجر)",
    file: "athan_nasreddintobarfajr",
    previewUrl: "/audio/athan/nasreddintobarfajr.mp3",
  },
  { id: "mohammedqassas", label: "محمد قصاص", file: "athan_mohammedqassas", previewUrl: "/audio/athan/mohammedqassas.mp3" },
];

/** How often the "صلِّ على النبي ﷺ" reminder repeats, in hours (1 to 5). */
export type SalawatFrequency = 1 | 2 | 3 | 4 | 5;

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export const PRAYER_LABELS: Record<PrayerKey, string> = {
  fajr: "الفجر",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

export interface NotificationSettings {
  athanEnabled: boolean;
  /** "same": one muezzin for all 5 prayers. "perPrayer": pick separately. */
  muezzinMode: "same" | "perPrayer";
  muezzinSame: MuezzinId;
  muezzinPerPrayer: Record<PrayerKey, MuezzinId>;
  salawatEnabled: boolean;
  salawatFrequencyHours: SalawatFrequency;
  azkarSabahEnabled: boolean;
  azkarMasaaEnabled: boolean;
  kahfEnabled: boolean;
  /** Cached last-known coordinates, used to compute prayer times offline. */
  lastCoords: { lat: number; lon: number } | null;
  /**
   * Governs the actual Athan/Azkar notification times (see
   * src/lib/notifications/prayerCalc.ts). Also read by the on-screen
   * "مواقيت الصلاة" page so the displayed times and the real Athan always
   * agree — a mismatch between the two is what previously made a person
   * think the Athan was firing "off by a minute or more" for no reason.
   */
  calculationMethod: CalculationMethodId;
  madhab: MadhabId;
}

const KEY = "zad:notifications:settings";

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  athanEnabled: false,
  muezzinMode: "same",
  muezzinSame: "makkah",
  muezzinPerPrayer: {
    fajr: "makkah",
    dhuhr: "makkah",
    asr: "makkah",
    maghrib: "makkah",
    isha: "makkah",
  },
  salawatEnabled: false,
  salawatFrequencyHours: 1,
  azkarSabahEnabled: false,
  azkarMasaaEnabled: false,
  kahfEnabled: false,
  lastCoords: null,
  calculationMethod: "egyptian",
  madhab: "shafi",
};

export function getNotificationSettings(): NotificationSettings {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw
      ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...(JSON.parse(raw) as Partial<NotificationSettings>) }
      : DEFAULT_NOTIFICATION_SETTINGS;
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export function setNotificationSettings(patch: Partial<NotificationSettings>): NotificationSettings {
  const next = { ...getNotificationSettings(), ...patch };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — silently ignore */
    }
    // The calculation method/madhab now live in exactly one place on screen
    // (the Athan settings, see PrayerNotificationsSettings.tsx) but the
    // "مواقيت الصلاة" times card on the same page still needs to reflect a
    // change the instant it happens, without re-requesting the device's
    // location. Broadcasting it here — right where the value is actually
    // persisted — means any listener on the page picks up the new method
    // immediately instead of only after a reload.
    if (patch.calculationMethod !== undefined || patch.madhab !== undefined) {
      try {
        window.dispatchEvent(
          new CustomEvent<{ calculationMethod: CalculationMethodId; madhab: MadhabId }>("zad:calc-method-changed", {
            detail: { calculationMethod: next.calculationMethod, madhab: next.madhab },
          })
        );
      } catch {
        /* CustomEvent unavailable in some old WebViews — not fatal */
      }
    }
  }
  return next;
}

export function findMuezzin(id: MuezzinId) {
  return MUEZZINS.find((m) => m.id === id) ?? MUEZZINS[0];
}
