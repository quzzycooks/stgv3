import { useCallback, useEffect, useRef, useState } from "react";

export type CrashDetectionStatus = "idle" | "unsupported" | "permission-denied" | "monitoring";

/** Sudden acceleration magnitude (m/s²) above which we treat it as an impact spike. ~2.5g. */
const SPIKE_THRESHOLD_MS2 = 25;
/** Don't re-trigger more than once per this window, so one impact doesn't fire repeatedly as the phone settles. */
const RETRIGGER_COOLDOWN_MS = 5000;

interface MotionPermissionAPI {
  requestPermission?: () => Promise<"granted" | "denied">;
}

async function requestMotionPermission(): Promise<"granted" | "denied" | "unnecessary"> {
  const ctor = window.DeviceMotionEvent as unknown as MotionPermissionAPI | undefined;
  if (typeof ctor?.requestPermission === "function") {
    try {
      const result = await ctor.requestPermission();
      return result === "granted" ? "granted" : "denied";
    } catch {
      return "denied";
    }
  }
  // Android / most non-iOS browsers expose devicemotion without an explicit permission prompt.
  return "unnecessary";
}

/**
 * Real accelerometer-based anomaly detection via the Web DeviceMotion API.
 * Works genuinely on a phone browser while this tab is in the foreground —
 * unlike a simulated report, this reacts to actual motion. It cannot run
 * with the screen off or the tab backgrounded; that gap is exactly why the
 * production app needs a native wrapper (Capacitor) for real background
 * detection. This is real signal, foreground-only.
 */
export function useCrashDetection(onSpike: (magnitudeMs2: number, gForce: number) => void) {
  const [status, setStatus] = useState<CrashDetectionStatus>("idle");
  const [liveMagnitude, setLiveMagnitude] = useState(0);
  const onSpikeRef = useRef(onSpike);
  onSpikeRef.current = onSpike;
  const lastTriggerAt = useRef(0);

  const start = useCallback(async (): Promise<CrashDetectionStatus> => {
    if (!("DeviceMotionEvent" in window)) {
      setStatus("unsupported");
      return "unsupported";
    }
    const permission = await requestMotionPermission();
    if (permission === "denied") {
      setStatus("permission-denied");
      return "permission-denied";
    }
    setStatus("monitoring");
    return "monitoring";
  }, []);

  const stop = useCallback(() => setStatus("idle"), []);

  useEffect(() => {
    if (status !== "monitoring") return;

    const handler = (event: DeviceMotionEvent) => {
      const a = event.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;

      const magnitude = Math.sqrt(a.x ** 2 + a.y ** 2 + a.z ** 2);
      setLiveMagnitude(magnitude);

      const now = Date.now();
      if (magnitude > SPIKE_THRESHOLD_MS2 && now - lastTriggerAt.current > RETRIGGER_COOLDOWN_MS) {
        lastTriggerAt.current = now;
        onSpikeRef.current(magnitude, magnitude / 9.81);
      }
    };

    window.addEventListener("devicemotion", handler);
    return () => window.removeEventListener("devicemotion", handler);
  }, [status]);

  return { status, liveMagnitude, start, stop };
}
