import { useCallback, useEffect, useRef, useState } from "react";

/** Counts down from `seconds`, calling `onComplete` once it hits 0. Restarting resets the clock. */
export function useCountdown(seconds: number, onComplete?: () => void) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) {
      setRunning(false);
      onCompleteRef.current?.();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [running, remaining]);

  const start = useCallback(() => {
    setRemaining(seconds);
    setRunning(true);
  }, [seconds]);

  const cancel = useCallback(() => {
    setRunning(false);
    setRemaining(seconds);
  }, [seconds]);

  return { remaining, running, start, cancel, progress: 1 - remaining / seconds };
}
