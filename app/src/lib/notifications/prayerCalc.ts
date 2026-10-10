// Fully-offline prayer time computation using the `adhan` astronomical
// library (no network call, unlike the live aladhan.com API used elsewhere
// on the site). This is what powers the local Athan / Azkar notifications so
// they keep working even without an internet connection.

import {
  CalculationMethod,
  Coordinates,
  Madhab,
  PrayerTimes,
} from "adhan";
import { findCalculationMethod, type CalculationMethodId, type MadhabId } from "@/lib/prayerMethods";

export interface DayPrayerTimes {
  date: Date;
  fajr: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

function buildParams(methodId: CalculationMethodId, madhabId: MadhabId) {
  const method = findCalculationMethod(methodId);
  const params = CalculationMethod[method.adhanMethod]();
  params.madhab = madhabId === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  return params;
}

export function computePrayerTimesForDate(
  lat: number,
  lon: number,
  date: Date,
  methodId: CalculationMethodId = "egyptian",
  madhabId: MadhabId = "shafi"
): DayPrayerTimes {
  const coordinates = new Coordinates(lat, lon);
  const params = buildParams(methodId, madhabId);
  const times = new PrayerTimes(coordinates, date, params);
  return {
    date,
    fajr: times.fajr,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  };
}

/** Computes prayer times for today and the following `days - 1` days. */
export function computePrayerTimesRange(
  lat: number,
  lon: number,
  days: number,
  methodId: CalculationMethodId = "egyptian",
  madhabId: MadhabId = "shafi"
): DayPrayerTimes[] {
  const out: DayPrayerTimes[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(computePrayerTimesForDate(lat, lon, d, methodId, madhabId));
  }
  return out;
}
