import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Radar, Zap, AlertCircle, Activity, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { detectionApi } from "@/api/detection";
import { extractErrorMessage } from "@/api/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useCrashDetection } from "@/hooks/useCrashDetection";

type Stage = "idle" | "monitor-starting" | "monitoring" | "analyzing" | "impact" | "reporting" | "error";

/**
 * Two ways to exercise the real POST /v1/detection/anomaly pipeline:
 *  - "Simulate anomaly" sends a fixed fake reading — works anywhere, including desktop.
 *  - "Start Live Monitoring" reads the phone's actual accelerometer via the
 *    DeviceMotion API and reacts to a real impact/shake. This genuinely
 *    works on a phone browser, but only in the foreground — the tab must
 *    stay open and the screen on. True background detection needs a native
 *    wrapper (Capacitor), which is why this is labeled "foreground only."
 */
export function DetectionDemoPage() {
  const navigate = useNavigate();
  const { gps } = useGeolocation();
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [lastGForce, setLastGForce] = useState<number | null>(null);
  const [mode, setMode] = useState<"simulated" | "live">("simulated");

  const report = async (compositeScore: number, amplitudeSpike: boolean, gForce?: number) => {
    setStage("analyzing");
    setLastScore(compositeScore);
    setLastGForce(gForce ?? null);
    await wait(1400);
    setStage("impact");
    await wait(1200);
    setStage("reporting");

    if (!gps) {
      setError("Couldn't get a GPS fix for this report.");
      setStage("error");
      return;
    }

    try {
      const result = await detectionApi.reportAnomaly({
        compositeScore,
        gps,
        incidentTypeHint: "RTA",
        amplitudeSpike,
      });
      if (result.sessionId) {
        navigate(`/welfare/${result.sessionId}`, { replace: true });
      } else {
        navigate("/welfare/simulated", { replace: true, state: { incidentId: undefined } });
      }
    } catch (err) {
      setError(extractErrorMessage(err, "Couldn't reach detection right now."));
      setStage("error");
    }
  };

  const runSimulation = () => {
    setMode("simulated");
    report(0.91, true);
  };

  const crash = useCrashDetection((magnitude, gForce) => {
    setMode("live");
    const compositeScore = Math.min(magnitude / 40, 1);
    void report(compositeScore, true, gForce);
  });

  const startMonitoring = async () => {
    setStage("monitor-starting");
    const result = await crash.start();
    setStage(result === "monitoring" ? "monitoring" : "idle");
  };

  const stopMonitoring = () => {
    crash.stop();
    setStage("idle");
  };

  const retry = () => (mode === "live" ? startMonitoring() : runSimulation());

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-canvas safe-top safe-bottom">
      <div className="flex items-center gap-3 px-6 pt-5">
        <button onClick={() => navigate(-1)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-card-elevated text-body">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-display text-lg font-extrabold text-body">Anomaly Detection</h1>
          <p className="text-xs text-muted">Real sensor pipeline, foreground only</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        {stage === "idle" && (
          <>
            <div className="grid h-24 w-24 place-items-center rounded-4xl bg-tint-accent text-accent">
              <Radar size={40} />
            </div>
            <h2 className="mt-6 font-display text-xl font-bold text-body">AI Protection is monitoring</h2>
            <p className="mt-2 max-w-xs text-sm text-muted">
              In the production app this runs silently in the background. On the web it can only run while this
              screen is open and your phone's screen is on.
            </p>

            <div className="mt-8 flex w-full flex-col gap-3">
              <Button size="lg" fullWidth icon={<Smartphone size={18} />} onClick={startMonitoring}>
                Start Live Monitoring
              </Button>
              <Button size="lg" fullWidth variant="outline" icon={<Zap size={18} />} onClick={runSimulation}>
                Simulate anomaly instead
              </Button>
            </div>

            {crash.status === "unsupported" && (
              <p className="mt-4 text-xs text-primary">This browser doesn't expose motion sensors — try a phone browser.</p>
            )}
            {crash.status === "permission-denied" && (
              <p className="mt-4 text-xs text-primary">Motion access was denied — allow it in your browser's site settings to use live monitoring.</p>
            )}
          </>
        )}

        {stage === "monitor-starting" && (
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border-subtle)] border-t-accent" />
            <p className="mt-5 text-sm font-semibold text-muted">Requesting motion access…</p>
          </div>
        )}

        {stage === "monitoring" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
            <div className="relative grid h-32 w-32 place-items-center rounded-full bg-tint-accent">
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-accent"
                animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              />
              <Activity size={40} className="text-accent" />
            </div>
            <p className="mt-6 font-semibold text-body">Monitoring your motion…</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-accent">{(crash.liveMagnitude / 9.81).toFixed(2)}g</p>
            <p className="mt-2 max-w-xs text-xs text-muted">
              Shake or firmly tap your phone to trigger a real reading — a genuine impact-level spike (~2.5g+) reports
              it through the real pipeline.
            </p>
            <button onClick={stopMonitoring} className="mt-8 rounded-full border-2 border-[var(--border-strong)] px-8 py-3 text-sm font-bold text-body">
              Stop monitoring
            </button>
          </motion.div>
        )}

        {stage === "analyzing" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
            <div className="relative grid h-32 w-32 place-items-center rounded-full bg-tint-accent">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="absolute inset-0 rounded-full border-2 border-accent"
                  animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
                />
              ))}
              <Radar size={40} className="text-accent" />
            </div>
            <p className="mt-6 font-semibold text-body">Analyzing motion signature…</p>
          </motion.div>
        )}

        {stage === "impact" && (
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
            <motion.div
              animate={{ x: [0, -8, 8, -6, 6, 0] }}
              transition={{ duration: 0.5 }}
              className="grid h-32 w-32 place-items-center rounded-full bg-tint-primary text-primary"
            >
              <AlertCircle size={48} />
            </motion.div>
            <p className="mt-6 font-display text-lg font-bold text-primary">
              {mode === "live" ? "Real impact signature detected" : "Impact signature detected"}
            </p>
            <p className="mt-1 text-sm text-muted">
              Composite score {lastScore?.toFixed(2)} — above threshold
              {lastGForce !== null && ` · ${lastGForce.toFixed(2)}g`}
            </p>
          </motion.div>
        )}

        {stage === "reporting" && (
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border-subtle)] border-t-primary" />
            <p className="mt-5 text-sm font-semibold text-muted">Reporting to Stignit…</p>
          </div>
        )}

        {stage === "error" && (
          <div className="flex flex-col items-center">
            <AlertCircle size={32} className="text-primary" />
            <p className="mt-4 text-sm text-muted">{error}</p>
            <Button className="mt-6" onClick={retry}>
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
