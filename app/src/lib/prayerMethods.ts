// Shared between the offline Athan scheduler (src/lib/notifications/prayerCalc.ts,
// which uses the `adhan` library entirely on-device) and the on-screen "مواقيت
// الصلاة" page (PrayerTimesClient.tsx, which uses the aladhan.com API online).
// Keeping one definition — with both the adhan.js key AND the matching
// aladhan.com numeric method id — is what lets a person pick a calculation
// method once and have the displayed times and the actual Athan notification
// always agree, instead of two independent, silently-different settings.

export type CalculationMethodId =
  | "egyptian"
  | "ummalqura"
  | "mwl"
  | "isna"
  | "karachi"
  | "kuwait"
  | "qatar"
  | "singapore"
  | "turkey"
  | "tehran"
  | "moonsighting"
  | "dubai";

export interface CalculationMethodOption {
  id: CalculationMethodId;
  label: string;
  /** Key into adhan.js's `CalculationMethod` object (see prayerCalc.ts). */
  adhanMethod:
    | "Egyptian"
    | "UmmAlQura"
    | "MuslimWorldLeague"
    | "NorthAmerica"
    | "Karachi"
    | "Kuwait"
    | "Qatar"
    | "Singapore"
    | "Turkey"
    | "Tehran"
    | "MoonsightingCommittee"
    | "Dubai";
  /** Matching method id for the aladhan.com API (api.aladhan.com/v1/timings). */
  aladhanId: number;
}

export const CALCULATION_METHODS: CalculationMethodOption[] = [
  { id: "egyptian", label: "الهيئة المصرية العامة للمساحة", adhanMethod: "Egyptian", aladhanId: 5 },
  { id: "ummalqura", label: "أم القرى - مكة المكرمة", adhanMethod: "UmmAlQura", aladhanId: 4 },
  { id: "mwl", label: "رابطة العالم الإسلامي", adhanMethod: "MuslimWorldLeague", aladhanId: 3 },
  { id: "isna", label: "الجمعية الإسلامية لأمريكا الشمالية (ISNA)", adhanMethod: "NorthAmerica", aladhanId: 2 },
  { id: "karachi", label: "جامعة العلوم الإسلامية - كراتشي", adhanMethod: "Karachi", aladhanId: 1 },
  { id: "kuwait", label: "الكويت", adhanMethod: "Kuwait", aladhanId: 9 },
  { id: "qatar", label: "قطر", adhanMethod: "Qatar", aladhanId: 10 },
  { id: "singapore", label: "سنغافورة", adhanMethod: "Singapore", aladhanId: 11 },
  { id: "turkey", label: "ديانت - تركيا", adhanMethod: "Turkey", aladhanId: 13 },
  { id: "tehran", label: "معهد الجيوفيزياء - جامعة طهران", adhanMethod: "Tehran", aladhanId: 7 },
  { id: "moonsighting", label: "لجنة رؤية الهلال العالمية", adhanMethod: "MoonsightingCommittee", aladhanId: 15 },
  { id: "dubai", label: "دبي", adhanMethod: "Dubai", aladhanId: 16 },
];

export function findCalculationMethod(id: CalculationMethodId): CalculationMethodOption {
  return CALCULATION_METHODS.find((m) => m.id === id) ?? CALCULATION_METHODS[0];
}

export type MadhabId = "shafi" | "hanafi";

export const MADHAB_OPTIONS: { id: MadhabId; label: string }[] = [
  { id: "shafi", label: "شافعي / مالكي / حنبلي" },
  { id: "hanafi", label: "حنفي" },
];
