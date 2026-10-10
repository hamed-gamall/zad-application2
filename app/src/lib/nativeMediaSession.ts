import { registerPlugin, Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

export interface MediaCommandEvent {
  command: "play" | "pause" | "next" | "previous" | "stop" | "seek";
  positionSeconds?: number;
}

/**
 * Emitted only for a track played via `playNativeRadio` (native ExoPlayer),
 * instead of the shared &lt;audio&gt; element's DOM events — see
 * MediaPlaybackService.java for why one station needs this.
 */
export interface NativeRadioStateEvent {
  state: "playing" | "paused" | "buffering" | "error";
}

interface MediaSessionPlugin {
  update(options: {
    title: string;
    artist: string;
    artworkUrl?: string;
    playing: boolean;
    positionSeconds: number;
    durationSeconds: number;
  }): Promise<void>;
  stop(): Promise<void>;
  /**
   * Plays a live stream via native ExoPlayer instead of the shared web
   * &lt;audio&gt; element. Only needed for a station whose stream a WebView
   * &lt;audio&gt; element can't reliably play (currently: "إذاعة القرآن
   * الكريم من القاهرة" — see MediaPlaybackService.java for the exact
   * reason). Reuses the same MediaSessionCompat/notification as every
   * other track.
   */
  playNativeRadio(options: { url: string; title: string; artist: string; artworkUrl?: string }): Promise<void>;
  pauseNativeRadio(): Promise<void>;
  resumeNativeRadio(): Promise<void>;
  addListener(
    eventName: "mediaCommand",
    listenerFunc: (event: MediaCommandEvent) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "nativeRadioState",
    listenerFunc: (event: NativeRadioStateEvent) => void
  ): Promise<PluginListenerHandle>;
}

const NativeMediaSession = registerPlugin<MediaSessionPlugin>("MediaSession");

/** True only on Android/iOS inside the Capacitor shell — a no-op everywhere else (web/PWA). */
export function hasNativeMediaSession() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export default NativeMediaSession;
