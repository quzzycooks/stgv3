import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Radar } from "lucide-react";
import { detectionApi } from "@/api/detection";
import { useCrashDetection } from "@/hooks/useCrashDetection";
import { useGeolocation } from "@/hooks/useGeolocation";

const IOS_GESTURE_REQUIRED =
  typeof window !== "undefined" &&
  typeof (window.DeviceMotionEvent as unknown as { requestPermission?: unknown })?.requestPermission === "function";

/**
 * Mounted once for the whole authenticated session (see ProtectedRoute), so the
 * real DeviceMotion pipeline that DetectionDemoPage exercises manually runs on
 * every screen automatically instead of only when that demo page is open.
 * iOS Safari requires the motion-permission prompt to originate from a tap, so
 * it can't be silent there — everywhere else this starts monitoring with zero
 * user action, immediately, for as long as the tab stays open.
 */
export function AmbientCrashDetection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gps } = useGeolocation(true);
  const gpsRef = useRef(gps);
  gpsRef.current = gps;
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;
  const [needsTapToEnable, setNeedsTapToEnable] = useState(IOS_GESTURE_REQUIRED);

  const crash = useCrashDetection((magnitude) => {
    // Already inside an active incident/welfare flow — don't open a second one.
    if (/^\/(welfare|incidents)\//.test(pathRef.current)) return;
    const g = gpsRef.current;
    if (!g) return;
    const compositeScore = Math.min(magnitude / 40, 1);
    detectionApi
      .reportAnomaly({ compositeScore, gps: g, incidentTypeHint: "RTA", amplitudeSpike: true })
      .then((result) => {
        navigate(result.sessionId ? `/welfare/${result.sessionId}` : "/welfare/simulated");
      })
      .catch(() => {});
  });

  useEffect(() => {
    if (!IOS_GESTURE_REQUIRED) void crash.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!needsTapToEnable || crash.status === "monitoring") return null;

  const enable = async () => {
    const result = await crash.start();
    if (result === "monitoring") setNeedsTapToEnable(false);
  };

  return (
    <button
      onClick={enable}
      className="safe-bottom fixed inset-x-4 bottom-4 z-50 flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-elevated"
    >
      <Radar size={16} />
      Enable crash detection for this session
    </button>
  );
}
