import { registerPlugin, Capacitor } from "@capacitor/core";

export interface NativeAthanItem {
  /** Same numeric id used for the matching capacitor local-notification (banner). */
  id: number;
  /** Epoch milliseconds of the prayer time. */
  atMillis: number;
  /** Android raw resource name for the muezzin's recording, e.g. "athan_makkah". */
  muezzinRaw: string;
  /** Arabic prayer label, e.g. "الفجر" — shown in the playback notification. */
  label: string;
}

interface AthanSchedulerPlugin {
  schedule(options: { items: NativeAthanItem[] }): Promise<void>;
  cancel(): Promise<void>;
  stopCurrent(): Promise<void>;
}

const NativeAthanScheduler = registerPlugin<AthanSchedulerPlugin>("AthanScheduler");

/** True only inside the Android app shell — a no-op everywhere else (web/PWA/iOS). */
export function hasNativeAthanPlayback() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export default NativeAthanScheduler;
