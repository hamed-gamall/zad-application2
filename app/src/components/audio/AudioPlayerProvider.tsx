"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SITE_NAME } from "@/lib/site";
import type { FavoriteItem } from "@/lib/storage";
import NativeMediaSession, { hasNativeMediaSession } from "@/lib/nativeMediaSession";

/**
 * One shared <audio> element, mounted once in the root layout (outside of
 * `{children}`), so it is never unmounted when the user navigates between
 * pages. Every audio surface in the app (reciters, tawashih, radio, ...)
 * pushes a playlist into this context instead of owning its own <audio>
 * element — that's what makes playback survive page navigation, and lets us
 * auto-advance to the next track even while the tab is in the background or
 * the phone's screen is locked (via the Media Session API).
 *
 * Note on real limits of web playback: this keeps audio alive as long as the
 * browser tab/PWA process is still running (background tab, locked screen,
 * "closed" PWA window on Android with the browser still active in the
 * background). It cannot keep playing after the browser is fully force-quit
 * or swiped away from the OS app switcher — no website can do that; only a
 * native app with a background service can.
 */

export interface AudioTrack {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  artwork?: string;
  /** Optional favorite descriptor, shown as a bookmark toggle in the mini player. */
  favorite?: {
    id: string;
    type: FavoriteItem["type"];
    label: string;
    href: string;
  };
  /** Optional direct-download link (falls back to `url`). */
  downloadUrl?: string;
  /**
   * Marks a track as a live stream (radio) rather than a finite recording.
   * Only live tracks get the "did we really finish, or just drop the
   * connection?" reconnect treatment on `ended` — regular recordings should
   * always advance to the next track normally when they end.
   */
  live?: boolean;
  /**
   * Live-only: returns a freshly-fetched, guaranteed-not-stale URL for this
   * same station (or null if that couldn't be obtained), used instead of
   * `url` when reconnecting after a real playback error. Some live streams
   * (Radiojar-hosted ones in particular) hand out a short-lived signed URL
   * — retrying with the original `url` after it expires fails identically
   * forever, which is what an endless "جارٍ الاتصال..." loop actually is.
   */
  refreshUrl?: () => Promise<string | null>;
  /**
   * Marks a track that must be played via native ExoPlayer instead of this
   * provider's shared &lt;audio&gt; element, when running inside the Android
   * app (ignored on the plain website). See MediaPlaybackService.java for
   * why one specific live station needs this — a WebView &lt;audio&gt;
   * element cannot follow its stream's occasional https→http redirect for
   * the same reason a desktop browser tab wouldn't (a mixed-content
   * violation), even though the stream itself is fine.
   */
  nativePlayback?: boolean;
}

interface AudioPlayerState {
  playlist: AudioTrack[];
  index: number;
  playing: boolean;
  loading: boolean;
  currentTime: number;
  duration: number;
  /**
   * True once every automatic reconnect attempt has been exhausted for the
   * current track and playback is still not happening — surfaced in the UI
   * (mini player / radio list) instead of silently looking "stuck" between
   * loading and stopped forever. Cleared the moment playback actually
   * starts again, on `stop()`, or when a new track/station is chosen.
   */
  error: boolean;
}

interface AudioPlayerContextValue extends AudioPlayerState {
  currentTrack: AudioTrack | null;
  hasNext: boolean;
  hasPrev: boolean;
  playPlaylist: (tracks: AudioTrack[], startIndex: number) => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  stop: () => void;
  /** Manually retries the current track after automatic reconnects gave up (see `error`). */
  retry: () => void;
  /** Playback speed for recordings (live streams ignore it). */
  rate: number;
  setRate: (r: number) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}

/** Safe to call from components that may render outside the provider (rare). */
export function useAudioPlayerSafe() {
  return useContext(AudioPlayerContext);
}

export default function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioPlayerState>({
    playlist: [],
    index: -1,
    playing: false,
    loading: false,
    currentTime: 0,
    duration: 0,
    error: false,
  });

  // Keep the latest state in a ref for use inside stable callbacks (media
  // session action handlers, `ended` handler) without re-subscribing them.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Tracks the user's *intent*: true whenever the user asked for playback to
  // be happening, regardless of what the underlying <audio> element is
  // currently doing. This is what lets us tell the difference between "the
  // user paused it" (do nothing) and "playback was interrupted by a phone
  // call, a notification, a dropped connection, or a background-tab
  // throttle" (try to resume automatically).
  const wantPlayingRef = useRef(false);
  const resumeStateRef = useRef<{ tries: number; timer: ReturnType<typeof setTimeout> | null }>({
    tries: 0,
    timer: null,
  });

  const clearResumeTimer = useCallback(() => {
    if (resumeStateRef.current.timer) {
      clearTimeout(resumeStateRef.current.timer);
      resumeStateRef.current.timer = null;
    }
    resumeStateRef.current.tries = 0;
  }, []);

  // Attempts to get playback going again after an involuntary stop. `reload`
  // re-fetches the current source first (for real playback errors / dropped
  // live streams); otherwise it just calls play() again (for OS-level
  // interruptions like calls or notifications, where the element itself is
  // still fine and just needs another nudge once focus/audio-focus returns).
  const MAX_RESUME_TRIES = 6;
  const scheduleResumeRef = useRef<(reload: boolean) => void>(() => {});
  const scheduleResume = useCallback((reload: boolean) => {
    if (!wantPlayingRef.current) return;
    const currentlyPlayingTrack = stateRef.current.playlist[stateRef.current.index];
    if (hasNativeMediaSession() && currentlyPlayingTrack?.nativePlayback) {
      // Native ExoPlayer manages its own reconnect/backoff entirely inside
      // MediaPlaybackService.java and reports state via the
      // "nativeRadioState" event — the shared <audio> element was never
      // playing this track in the first place, so there is nothing here to
      // resume, and doing so would start a second, competing playback
      // attempt on top of the native one.
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (resumeStateRef.current.timer) return; // an attempt is already queued

    const tries = resumeStateRef.current.tries;
    if (tries >= MAX_RESUME_TRIES) {
      // Every automatic attempt failed — stop retrying silently and tell
      // the UI, instead of leaving the person staring at an indefinite
      // "جارٍ الاتصال..." that will never resolve on its own.
      setState((s) => ({ ...s, loading: false, playing: false, error: true }));
      return;
    }
    const delay = Math.min(1000 * 2 ** tries, 10000);

    resumeStateRef.current.timer = setTimeout(async () => {
      resumeStateRef.current.timer = null;
      if (!wantPlayingRef.current) return;
      const a = audioRef.current;
      if (!a) return;
      if (reload) {
        const track = stateRef.current.playlist[stateRef.current.index];
        const resumeAt = stateRef.current.currentTime;
        if (track) {
          // Live streams (radio): a stale/expired signed URL is a very
          // common real cause of "connects for a second then dies on every
          // retry" — get a fresh one before trying again rather than
          // hammering the same URL forever. Falls back to the original URL
          // if a fresh one couldn't be fetched (e.g. no network).
          let src = track.url;
          if (track.live && track.refreshUrl) {
            const fresh = await track.refreshUrl().catch(() => null);
            if (fresh) src = fresh;
          }
          // Guard against a track/station change (or stop()) that happened
          // while we were awaiting refreshUrl() above.
          if (!wantPlayingRef.current || stateRef.current.playlist[stateRef.current.index]?.id !== track.id) {
            return;
          }
          a.src = src;
          a.load();
          // Resuming at the previous position only makes sense for a
          // finite recording that dropped mid-playback. A live stream has
          // no "resume point" to seek back to — the reconnect always lands
          // at whatever moment is currently live, so forcing the old
          // currentTime onto it only ever produces a confusing seek error
          // or a silent no-op, never an actual resume.
          if (!track.live && resumeAt > 0 && isFinite(resumeAt)) {
            const onLoaded = () => {
              a.currentTime = resumeAt;
              a.removeEventListener("loadedmetadata", onLoaded);
            };
            a.addEventListener("loadedmetadata", onLoaded);
          }
        }
      }
      a.play()
        .then(() => {
          resumeStateRef.current.tries = 0;
        })
        .catch(() => {
          resumeStateRef.current.tries = Math.min(tries + 1, MAX_RESUME_TRIES);
          scheduleResumeRef.current(reload);
        });
    }, delay);
  }, []);
  useEffect(() => {
    scheduleResumeRef.current = scheduleResume;
  }, [scheduleResume]);

  const currentTrack = state.index >= 0 ? state.playlist[state.index] ?? null : null;

  const loadAndPlay = useCallback(
    (tracks: AudioTrack[], index: number) => {
      const track = tracks[index];
      if (!track) return;
      clearResumeTimer();
      resumeStateRef.current.tries = 0;

      const audio = audioRef.current;
      const useNative = hasNativeMediaSession() && track.nativePlayback;

      if (useNative) {
        // Stop the shared <audio> element first, with intent-tracking
        // briefly off so its resulting `pause` event (if it was mid-
        // playback of a *previous*, non-native track) can't trigger the
        // normal auto-resume logic — there must never be two things
        // producing sound at once.
        wantPlayingRef.current = false;
        if (audio) {
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
        }
        wantPlayingRef.current = true;
        setState((s) => ({ ...s, playlist: tracks, index, currentTime: 0, duration: 0, loading: true, error: false }));
        NativeMediaSession.playNativeRadio({
          url: track.url,
          title: track.title,
          artist: track.subtitle,
          artworkUrl: track.artwork,
        }).catch(() => {
          setState((s) => ({ ...s, playing: false, loading: false, error: true }));
        });
        return;
      }

      wantPlayingRef.current = true;
      setState((s) => ({ ...s, playlist: tracks, index, currentTime: 0, duration: 0, loading: true, error: false }));
      if (!audio) return;
      audio.src = track.url;
      audio.play().catch(() => {
        setState((s) => ({ ...s, playing: false, loading: false }));
      });
    },
    [clearResumeTimer]
  );

  const playPlaylist = useCallback(
    (tracks: AudioTrack[], startIndex: number) => {
      if (!tracks[startIndex]) return;
      const current = stateRef.current;
      // Re-tapping the currently playing track just toggles play/pause.
      if (current.playlist[current.index]?.id === tracks[startIndex].id) {
        const track = tracks[startIndex];
        if (hasNativeMediaSession() && track.nativePlayback) {
          if (current.playing) {
            wantPlayingRef.current = false;
            clearResumeTimer();
            NativeMediaSession.pauseNativeRadio().catch(() => {});
          } else {
            wantPlayingRef.current = true;
            NativeMediaSession.resumeNativeRadio().catch(() => {});
          }
          return;
        }
        const audio = audioRef.current;
        if (!audio) return;
        if (current.playing) {
          wantPlayingRef.current = false;
          clearResumeTimer();
          audio.pause();
        } else {
          wantPlayingRef.current = true;
          audio.play().catch(() => {});
        }
        return;
      }
      loadAndPlay(tracks, startIndex);
    },
    [loadAndPlay, clearResumeTimer]
  );

  const togglePlay = useCallback(() => {
    const { playlist, index, playing } = stateRef.current;
    const track = index >= 0 ? playlist[index] : null;
    if (!track) return;
    if (hasNativeMediaSession() && track.nativePlayback) {
      if (playing) {
        wantPlayingRef.current = false;
        clearResumeTimer();
        NativeMediaSession.pauseNativeRadio().catch(() => {});
      } else {
        wantPlayingRef.current = true;
        NativeMediaSession.resumeNativeRadio().catch(() => {});
      }
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      wantPlayingRef.current = false;
      clearResumeTimer();
      audio.pause();
    } else {
      wantPlayingRef.current = true;
      audio.play().catch(() => {});
    }
  }, [clearResumeTimer]);

  const play = useCallback(() => {
    const { playlist, index } = stateRef.current;
    const track = index >= 0 ? playlist[index] : null;
    wantPlayingRef.current = true;
    if (track && hasNativeMediaSession() && track.nativePlayback) {
      NativeMediaSession.resumeNativeRadio().catch(() => {});
      return;
    }
    audioRef.current?.play().catch(() => {});
  }, []);
  const pause = useCallback(() => {
    const { playlist, index } = stateRef.current;
    const track = index >= 0 ? playlist[index] : null;
    wantPlayingRef.current = false;
    clearResumeTimer();
    if (track && hasNativeMediaSession() && track.nativePlayback) {
      NativeMediaSession.pauseNativeRadio().catch(() => {});
      return;
    }
    audioRef.current?.pause();
  }, [clearResumeTimer]);

  const next = useCallback(() => {
    const { playlist, index } = stateRef.current;
    if (index + 1 < playlist.length) loadAndPlay(playlist, index + 1);
  }, [loadAndPlay]);

  const prev = useCallback(() => {
    const { playlist, index } = stateRef.current;
    if (index - 1 >= 0) loadAndPlay(playlist, index - 1);
  }, [loadAndPlay]);

  const seek = useCallback((seconds: number) => {
    if (audioRef.current) audioRef.current.currentTime = seconds;
  }, []);

  /** Manual "حاول مرة أخرى" after the automatic reconnect attempts gave up. */
  const [rate, setRateState] = useState(1);
  const setRate = useCallback((r: number) => {
    setRateState(r);
    const a = audioRef.current;
    if (a) {
      a.defaultPlaybackRate = r;
      a.playbackRate = r;
    }
  }, []);

  useEffect(() => {
    // A new <audio src> can reset the speed; keep the chosen one for recordings.
    const a = audioRef.current;
    if (a && !currentTrack?.live) a.playbackRate = rate;
  }, [currentTrack?.id, currentTrack?.live, rate]);

  const retry = useCallback(() => {
    if (stateRef.current.index < 0) return;
    const track = stateRef.current.playlist[stateRef.current.index];
    resumeStateRef.current.tries = 0;
    wantPlayingRef.current = true;
    setState((s) => ({ ...s, error: false, loading: true }));
    if (track && hasNativeMediaSession() && track.nativePlayback) {
      // Always a fresh ExoPlayer instance rather than trying to resume the
      // old one — see startNativeExoPlayer's comment for why.
      NativeMediaSession.playNativeRadio({
        url: track.url,
        title: track.title,
        artist: track.subtitle,
        artworkUrl: track.artwork,
      }).catch(() => {
        setState((s) => ({ ...s, playing: false, loading: false, error: true }));
      });
      return;
    }
    scheduleResume(true);
  }, [scheduleResume]);

  const stop = useCallback(() => {
    wantPlayingRef.current = false;
    clearResumeTimer();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    if (hasNativeMediaSession()) NativeMediaSession.stop().catch(() => {});
    setState({ playlist: [], index: -1, playing: false, loading: false, currentTime: 0, duration: 0, error: false });
  }, [clearResumeTimer]);

  // ---- <audio> element event wiring ----
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => {
      clearResumeTimer();
      setState((s) => ({ ...s, playing: true, loading: false, error: false }));
    };
    const onPause = () => {
      setState((s) => ({ ...s, playing: false }));
      // If the user didn't ask for this, the OS (or the network) paused us —
      // a phone call, a notification banner, losing audio focus to another
      // app, or the tab being throttled in the background. Try to pick
      // playback back up rather than silently staying stopped.
      if (wantPlayingRef.current) scheduleResume(false);
    };
    const onWaiting = () => setState((s) => ({ ...s, loading: true }));
    const onPlaying = () => {
      clearResumeTimer();
      setState((s) => ({ ...s, loading: false, error: false }));
    };
    const onTimeUpdate = () => setState((s) => ({ ...s, currentTime: audio.currentTime }));
    const onLoadedMetadata = () => setState((s) => ({ ...s, duration: audio.duration || 0 }));
    // A real playback error (dropped connection, flaky mobile network, a
    // radio stream hiccup, ...) — reload the source and resume instead of
    // just going silent.
    const onError = () => {
      setState((s) => ({ ...s, loading: false }));
      if (wantPlayingRef.current) scheduleResume(true);
    };
    // Buffering stalled for a while — nudge it; harmless if it recovers on
    // its own first.
    const onStalled = () => {
      if (wantPlayingRef.current) scheduleResume(false);
    };
    // Auto-advance to the next track — this fires whether the tab is
    // focused, backgrounded, or the phone screen is locked, as long as the
    // browser process is still alive.
    const onEnded = () => {
      const { playlist, index } = stateRef.current;
      const track = playlist[index];
      // Live radio streams can fire `ended` when the connection drops rather
      // than because there's actually nothing left to play — reconnect
      // instead of treating that as the end. Regular recordings always
      // advance normally; their `duration` metadata isn't reliable enough
      // (varies by server) to second-guess a real, honest `ended` event.
      if (track?.live && wantPlayingRef.current) {
        scheduleResume(true);
        return;
      }
      if (index + 1 < playlist.length) {
        loadAndPlay(playlist, index + 1);
      } else {
        wantPlayingRef.current = false;
        setState((s) => ({ ...s, playing: false }));
      }
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("error", onError);
    audio.addEventListener("stalled", onStalled);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("stalled", onStalled);
      audio.removeEventListener("ended", onEnded);
    };
  }, [loadAndPlay, scheduleResume, clearResumeTimer]);

  // Belt-and-braces: when the tab/app regains focus (e.g. right after a
  // phone call ends or a notification is dismissed), double-check we're
  // actually playing if we're supposed to be — some mobile browsers don't
  // fire a clean `pause` event for these interruptions at all.
  useEffect(() => {
    const tryResumeIfNeeded = () => {
      if (document.visibilityState !== "visible") return;
      if (!wantPlayingRef.current) return;
      const audio = audioRef.current;
      if (audio && audio.paused) {
        resumeStateRef.current.tries = 0;
        scheduleResume(false);
      }
    };
    document.addEventListener("visibilitychange", tryResumeIfNeeded);
    window.addEventListener("focus", tryResumeIfNeeded);
    window.addEventListener("pageshow", tryResumeIfNeeded);
    return () => {
      document.removeEventListener("visibilitychange", tryResumeIfNeeded);
      window.removeEventListener("focus", tryResumeIfNeeded);
      window.removeEventListener("pageshow", tryResumeIfNeeded);
    };
  }, [scheduleResume]);

  // ---- Native ExoPlayer state bridge (Android shell only, native-playback
  // tracks only): MediaPlaybackService.java reports playback state directly
  // via this event instead of the shared <audio> element's DOM events,
  // since the <audio> element was never the one actually playing this
  // track — see AudioTrack.nativePlayback. ----
  useEffect(() => {
    if (!hasNativeMediaSession()) return;
    let handle: { remove: () => void } | null = null;
    NativeMediaSession.addListener("nativeRadioState", (event) => {
      // A stray/late event from a station already switched away from must
      // not resurrect its playing/loading/error flags.
      const track = stateRef.current.playlist[stateRef.current.index];
      if (!track?.nativePlayback) return;
      switch (event.state) {
        case "playing":
          clearResumeTimer();
          setState((s) => ({ ...s, playing: true, loading: false, error: false }));
          break;
        case "paused":
          setState((s) => ({ ...s, playing: false, loading: false }));
          break;
        case "buffering":
          setState((s) => ({ ...s, loading: true }));
          break;
        case "error":
          setState((s) => ({ ...s, playing: false, loading: false, error: true }));
          break;
      }
    }).then((h) => {
      handle = h;
    });
    return () => {
      handle?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Native MediaSession bridge (Android shell only): mirrors playback
  // into a real Android foreground service + lock-screen notification, which
  // a WebView <audio> element cannot produce on its own, and is also what
  // keeps a live stream/long recitation from being throttled once the screen
  // locks or the app leaves the foreground. ----
  useEffect(() => {
    if (!hasNativeMediaSession()) return;
    let handle: { remove: () => void } | null = null;
    NativeMediaSession.addListener("mediaCommand", (event) => {
      switch (event.command) {
        case "play":
          play();
          break;
        case "pause":
          pause();
          break;
        case "next":
          next();
          break;
        case "previous":
          prev();
          break;
        case "stop":
          stop();
          break;
        case "seek":
          if (event.positionSeconds != null) seek(event.positionSeconds);
          break;
      }
    }).then((h) => {
      handle = h;
    });
    return () => {
      handle?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nativeSyncRef = useRef<{ trackId?: string; playing?: boolean; lastSyncAt: number }>({
    lastSyncAt: 0,
  });
  useEffect(() => {
    if (!hasNativeMediaSession()) return;
    if (!currentTrack) {
      NativeMediaSession.stop().catch(() => {});
      return;
    }
    // Native-playback tracks push their own session/notification state
    // directly from Java (see MediaPlaybackService.pushNativeState) as
    // ExoPlayer's real state changes — sending a JS-computed mirror update
    // here too would fight with that using stale info (the shared <audio>
    // element never actually loaded this track, so its position/duration
    // are meaningless for it).
    if (currentTrack.nativePlayback) return;
    // A track or play/pause change always syncs immediately — those are the
    // moments a stale position is most noticeable (e.g. resuming from a
    // different spot, or a new track starting at 0). Plain progress while
    // playing is throttled to roughly once a second: the lock-screen
    // scrubber only needs a periodic anchor point (it animates smoothly
    // between updates on its own), and calling the native bridge on every
    // <audio> timeupdate tick (several times a second) would be wasteful.
    // Without *some* periodic update, though, the reported position would
    // freeze at whatever it was when playback started and never reflect
    // where the track actually is — which is exactly what made the
    // lock-screen scrubber and elapsed/duration display unusable before.
    const ref = nativeSyncRef.current;
    const isTransition = ref.trackId !== currentTrack.id || ref.playing !== state.playing;
    const now = Date.now();
    if (!isTransition && now - ref.lastSyncAt < 1000) return;
    ref.trackId = currentTrack.id;
    ref.playing = state.playing;
    ref.lastSyncAt = now;

    NativeMediaSession.update({
      title: currentTrack.title,
      artist: currentTrack.subtitle,
      artworkUrl: currentTrack.artwork ?? undefined,
      playing: state.playing,
      positionSeconds: state.currentTime,
      durationSeconds: state.duration,
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, state.playing, state.currentTime]);

  // ---- Media Session API: lock-screen / notification-shade controls, and
  // what lets the "next track" keep advancing while the app is in the
  // background on mobile.
  //
  // Skipped entirely inside the native Android shell: Chromium's WebView
  // creates its own auto-generated system MediaSession the moment
  // `navigator.mediaSession.metadata` is set, running in parallel with —
  // and competing against — the real MediaSessionCompat built natively in
  // MediaPlaybackService.java (see nativeMediaSession.ts). Android then
  // sometimes surfaces that thinner, auto-generated session instead of ours,
  // which is what kept showing the generic "This phone" label even after
  // the native session was correctly wired up with the app's identity.
  // Native Android already gets everything this block provides — real
  // lock-screen controls, background advancing — from the native session
  // instead, so this is purely redundant there, not just harmless. ----
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
    if (hasNativeMediaSession()) return;
    const ms = navigator.mediaSession;
    if (currentTrack) {
      ms.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.subtitle,
        album: SITE_NAME,
        artwork: currentTrack.artwork
          ? [{ src: currentTrack.artwork, sizes: "512x512", type: "image/png" }]
          : [{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }],
      });
      ms.playbackState = state.playing ? "playing" : "paused";
    } else {
      ms.metadata = null;
    }
    ms.setActionHandler("play", () => play());
    ms.setActionHandler("pause", () => pause());
    ms.setActionHandler("previoustrack", () => prev());
    ms.setActionHandler("nexttrack", () => next());
    ms.setActionHandler("seekto", (details) => {
      if (details.seekTime != null) seek(details.seekTime);
    });
    ms.setActionHandler("seekbackward", (details) => {
      seek(Math.max(0, (audioRef.current?.currentTime ?? 0) - (details.seekOffset || 10)));
    });
    ms.setActionHandler("seekforward", (details) => {
      seek((audioRef.current?.currentTime ?? 0) + (details.seekOffset || 10));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, state.playing]);

  // Keep the OS scrubber (lock screen progress bar) in sync — web/PWA only,
  // same reasoning as the block above.
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
    if (hasNativeMediaSession()) return;
    if (!state.duration || !isFinite(state.duration)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: state.duration,
        position: Math.min(state.currentTime, state.duration),
        playbackRate: 1,
      });
    } catch {
      // Some browsers throw if called too early / with stale values — safe to ignore.
    }
  }, [state.currentTime, state.duration]);

  const value = useMemo<AudioPlayerContextValue>(
    () => ({
      ...state,
      currentTrack,
      hasNext: state.index + 1 < state.playlist.length,
      hasPrev: state.index - 1 >= 0,
      playPlaylist,
      togglePlay,
      play,
      pause,
      next,
      prev,
      seek,
      stop,
      retry,
      rate,
      setRate,
    }),
    [state, currentTrack, playPlaylist, togglePlay, play, pause, next, prev, seek, stop, retry, rate, setRate]
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
      {/* Single persistent <audio> element for the whole app. */}
      <audio ref={audioRef} preload="auto" playsInline className="hidden" />
    </AudioPlayerContext.Provider>
  );
}
