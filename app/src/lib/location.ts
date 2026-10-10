import { Capacitor } from "@capacitor/core";

// One source of truth for "where is this person?". Everything that needs a
// place — prayer times, Qibla, Adhkar windows, Athan alarms — reads from here
// so they can never disagree. Order of trust: a place the person typed
// (manual) > a real GPS fix > an approximate IP guess (always labelled).

export type LocationSource = "gps" | "ip" | "manual";
export interface UserLocation {
  lat: number;
  lon: number;
  label: string;
  country?: string;
  source: LocationSource;
  accuracy?: number;
  at: number;
}
export class LocationError extends Error {
  constructor(public kind: "denied" | "unavailable" | "timeout" | "unsupported", message: string) {
    super(message);
  }
}

const KEY = "zad:location:v2";
const EVENT = "zad:location-changed";

export function getSavedLocation(): UserLocation | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const l = JSON.parse(raw) as UserLocation;
    return Number.isFinite(l.lat) && Number.isFinite(l.lon) ? l : null;
  } catch {
    return null;
  }
}
export function saveLocation(l: UserLocation) {
  try {
    localStorage.setItem(KEY, JSON.stringify(l));
  } catch {
    /* storage full / private mode — still broadcast so this session works */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: l }));
}
export function onLocationChange(cb: (l: UserLocation) => void) {
  const h = (e: Event) => cb((e as CustomEvent<UserLocation>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

type Fix = { lat: number; lon: number; accuracy?: number };

function webFix(highAccuracy: boolean, maximumAge: number, timeout: number): Promise<Fix> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new LocationError("unsupported", "الجهاز لا يدعم تحديد الموقع"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) =>
        reject(
          e.code === 1
            ? new LocationError("denied", "إذن الموقع مرفوض")
            : e.code === 3
              ? new LocationError("timeout", "انتهت مهلة تحديد الموقع")
              : new LocationError("unavailable", "تعذّر تحديد الموقع")
        ),
      { enableHighAccuracy: highAccuracy, maximumAge, timeout }
    );
  });
}

async function nativeFix(): Promise<Fix> {
  const { Geolocation } = await import("@capacitor/geolocation");
  let perm = await Geolocation.checkPermissions();
  if (perm.location !== "granted" && perm.coarseLocation !== "granted") {
    perm = await Geolocation.requestPermissions({ permissions: ["location", "coarseLocation"] });
  }
  if (perm.location !== "granted" && perm.coarseLocation !== "granted") {
    throw new LocationError("denied", "إذن الموقع مرفوض");
  }
  const get = (high: boolean, maximumAge: number, timeout: number) =>
    Geolocation.getCurrentPosition({ enableHighAccuracy: high, maximumAge, timeout }).then((p) => ({
      lat: p.coords.latitude,
      lon: p.coords.longitude,
      accuracy: p.coords.accuracy,
    }));
  try {
    return await get(true, 0, 15000);
  } catch {
    try {
      return await get(false, 5 * 60 * 1000, 10000); // indoors: network fix is fine for prayer times
    } catch {
      throw new LocationError("unavailable", "تعذّر تحديد الموقع. فعّل GPS ثم أعد المحاولة");
    }
  }
}

async function gpsFix(): Promise<Fix> {
  if (Capacitor.isNativePlatform()) return nativeFix();
  try {
    return await webFix(true, 0, 15000);
  } catch (e) {
    if (e instanceof LocationError && e.kind === "denied") throw e;
    return webFix(false, 5 * 60 * 1000, 10000);
  }
}

async function getJson(url: string, ms = 7000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

/** Human place name (Arabic) for coordinates. Never throws. */
export async function reverseGeocode(lat: number, lon: number): Promise<{ label: string; country?: string }> {
  try {
    const j = await getJson(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ar`);
    const place = j.city || j.locality || j.principalSubdivision;
    const region = j.principalSubdivision && j.principalSubdivision !== place ? j.principalSubdivision : j.countryName;
    const label = [place, region].filter(Boolean).join("، ");
    if (label) return { label, country: j.countryCode };
  } catch {
    /* offline or blocked — fall through */
  }
  return { label: `${lat.toFixed(2)}°، ${lon.toFixed(2)}°` };
}

async function ipLocation(): Promise<UserLocation> {
  const j = await getJson("https://ipwho.is/?lang=ar");
  if (!j || j.success === false || typeof j.latitude !== "number") throw new LocationError("unavailable", "تعذّر تحديد الموقع");
  return { lat: j.latitude, lon: j.longitude, label: [j.city, j.country].filter(Boolean).join("، "), country: j.country_code, source: "ip", at: Date.now() };
}

/** Real position: GPS first; if the device refuses/fails, an approximate IP guess. */
export async function detectLocation(): Promise<UserLocation> {
  try {
    const f = await gpsFix();
    const place = await reverseGeocode(f.lat, f.lon);
    const loc: UserLocation = { lat: f.lat, lon: f.lon, label: place.label, country: place.country, source: "gps", accuracy: f.accuracy, at: Date.now() };
    saveLocation(loc);
    return loc;
  } catch (gpsErr) {
    try {
      const loc = await ipLocation();
      saveLocation(loc);
      return loc;
    } catch {
      throw gpsErr instanceof LocationError ? gpsErr : new LocationError("unavailable", "تعذّر تحديد الموقع");
    }
  }
}

/** A place the person typed (city, village, address). Saved and preferred over GPS. */
export async function setManualLocation(query: string): Promise<UserLocation> {
  const q = query.trim();
  if (!q) throw new LocationError("unavailable", "اكتب اسم المدينة");
  const res = await getJson(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=1&accept-language=ar&addressdetails=1`);
  const hit = Array.isArray(res) ? res[0] : null;
  if (!hit) throw new LocationError("unavailable", "لم نجد هذا المكان، جرّب كتابة الاسم بشكل مختلف");
  const a = hit.address ?? {};
  const label = [a.city || a.town || a.village || a.county || hit.name, a.state || a.country].filter(Boolean).join("، ") || q;
  const loc: UserLocation = { lat: Number(hit.lat), lon: Number(hit.lon), label, country: a.country_code?.toUpperCase(), source: "manual", at: Date.now() };
  saveLocation(loc);
  return loc;
}

export function describeLocationError(e: unknown): string {
  if (e instanceof LocationError) {
    if (e.kind === "denied") return "إذن الموقع مرفوض. فعّله من إعدادات الهاتف أو اكتب اسم مدينتك.";
    return e.message;
  }
  return "تعذّر تحديد الموقع. اكتب اسم مدينتك للمتابعة.";
}
