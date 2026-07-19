import { useCallback, useEffect, useState } from "react";
import type { Gps } from "@/api/types";

interface GeolocationState {
  gps: Gps | null;
  error: string | null;
  loading: boolean;
}

function friendlyMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location access was denied. Allow it in your browser's site settings, then try again.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Your device couldn't determine a location right now.";
  }
  return "Getting your location timed out. Check your connection and try again.";
}

const HIGH_ACCURACY_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 };
const LOW_ACCURACY_OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 30_000 };

export function useGeolocation(watch = false) {
  const [state, setState] = useState<GeolocationState>({ gps: null, error: null, loading: true });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState({ gps: null, error: "Location isn't available on this device.", loading: false });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    let watchId: number | null = null;
    let usedFallback = false;

    const onSuccess = (position: GeolocationPosition) => {
      setState({
        gps: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        },
        error: null,
        loading: false,
      });
    };

    const request = (options: PositionOptions) => {
      const onError = (error: GeolocationPositionError) => {
        // A GPS-forced fix can hard-fail (or time out) indoors/low-signal even with
        // permission granted. Fall back once to network-based (WiFi/cell) positioning
        // before surfacing an error — that succeeds in most cases where GPS can't.
        if (!usedFallback && error.code !== error.PERMISSION_DENIED) {
          usedFallback = true;
          if (watchId !== null) navigator.geolocation.clearWatch(watchId);
          request(LOW_ACCURACY_OPTIONS);
          return;
        }
        setState({ gps: null, error: friendlyMessage(error), loading: false });
      };

      if (watch) {
        watchId = navigator.geolocation.watchPosition(onSuccess, onError, options);
      } else {
        navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
      }
    };

    request(HIGH_ACCURACY_OPTIONS);

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [watch, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { ...state, retry };
}
