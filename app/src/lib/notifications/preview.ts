"use client";

// A single, module-level Audio element shared by every "preview this
// reciter's voice" button in the app. Selecting a new reciter always stops
// whatever was playing first, so only one preview can ever play at once.
//
// `onEnd` is called whenever playback stops for ANY reason — it finished on
// its own, a new preview replaced it, or `stopPreview()` was called
// explicitly — so callers (e.g. the settings screen) can reliably reset
// their "is this one playing?" UI state instead of getting stuck showing a
// sound as playing after it has actually stopped.

let current: HTMLAudioElement | null = null;
let currentOnEnd: (() => void) | null = null;

export function playPreview(url: string, onEnd?: () => void) {
  if (typeof window === "undefined") return;
  stopPreview();

  const audio = new Audio(url);
  current = audio;
  currentOnEnd = onEnd ?? null;

  const finish = () => {
    if (current === audio) {
      current = null;
      currentOnEnd = null;
    }
    onEnd?.();
  };

  audio.addEventListener("ended", finish, { once: true });
  audio.play().catch(() => {
    // autoplay might be blocked before the first user gesture — ignore,
    // but still clear the "playing" state so the UI doesn't get stuck.
    finish();
  });
}

export function stopPreview() {
  if (!current) return;
  const onEnd = currentOnEnd;
  current.pause();
  current.currentTime = 0;
  current = null;
  currentOnEnd = null;
  onEnd?.();
}
