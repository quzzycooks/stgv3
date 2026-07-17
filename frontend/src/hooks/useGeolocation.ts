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

export function useGeolocation(watch = false) {
  const [state, setState] = useState<GeolocationState>({ gps: null, error: null, loading: true });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState({ gps: null, error: "Location isn't available on this device.", loading: false });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

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

    const onError = (error: GeolocationPositionError) => {
      setState({ gps: null, error: friendlyMessage(error), loading: false });
    };

    const options: PositionOptions = { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 };

    if (watch) {
      const id = navigator.geolocation.watchPosition(onSuccess, onError, options);
      return () => navigator.geolocation.clearWatch(id);
    }
    navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
  }, [watch, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { ...state, retry };
}
