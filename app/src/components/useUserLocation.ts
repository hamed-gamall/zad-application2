"use client";

import { useCallback, useEffect, useState } from "react";
import { describeLocationError, detectLocation, getSavedLocation, onLocationChange, setManualLocation, type UserLocation } from "@/lib/location";

const FRESH_MS = 10 * 60 * 1000;

/** Shared location state. Shows the saved place instantly, refreshes GPS in
 * the background when it's stale, and never replaces a typed place on its own. */
export function useUserLocation() {
  const [loc, setLoc] = useState<UserLocation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setLoc(await detectLocation());
    } catch (e) {
      setError(describeLocationError(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const setManual = useCallback(async (q: string) => {
    setBusy(true);
    setError(null);
    try {
      setLoc(await setManualLocation(q));
      return true;
    } catch (e) {
      setError(describeLocationError(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const saved = getSavedLocation();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setLoc(saved);
    if (!saved || (saved.source !== "manual" && Date.now() - saved.at > FRESH_MS)) refresh();
    return onLocationChange(setLoc);
  }, [refresh]);

  return { loc, busy, error, refresh, setManual };
}
