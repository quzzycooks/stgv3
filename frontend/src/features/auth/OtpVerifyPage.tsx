import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { authApi } from "@/api/auth";
import { extractErrorMessage } from "@/api/client";
import { useAuthStore } from "@/stores/authStore";
import { useCountdown } from "@/hooks/useCountdown";
import { formatNigerianPhone } from "@/lib/schemas/auth";
import { isPlatformAuthenticatorAvailable, hasQuickUnlockCredential, registerQuickUnlock } from "@/lib/webauthn";
import { useUiStore } from "@/stores/uiStore";

interface LocationState {
  phone: string;
  resendInSec: number;
  devCode?: string;
}

export function OtpVerifyPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const locationState = state as LocationState | null;

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [offerUnlock, setOfferUnlock] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const resend = useCountdown(locationState?.resendInSec ?? 30);
  const setSession = useAuthStore((s) => s.setSession);
  const setQuickUnlockEnabled = useUiStore((s) => s.setQuickUnlockEnabled);

  useEffect(() => {
    if (!locationState?.phone) {
      navigate("/login", { replace: true });
      return;
    }
    resend.start();
    inputRefs.current[0]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!locationState?.phone) return null;
  const { phone, devCode } = locationState;

  const code = digits.join("");

  const handleChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      setDigits(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const routeAfterAuth = (registrationComplete: boolean) => {
    if (!registrationComplete) return "/register/identity";
    return useAuthStore.getState().consumeRedirectAfterAuth() ?? "/home";
  };

  const verify = async (fullCode: string) => {
    setError(null);
    setVerifying(true);
    try {
      const result = await authApi.verifyOtp(phone, fullCode);
      setSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        userId: result.userId,
        accessLevel: result.accessLevel,
        registrationComplete: result.registrationComplete,
      });

      const nextRoute = routeAfterAuth(result.registrationComplete);
      const canOfferUnlock = (await isPlatformAuthenticatorAvailable()) && !hasQuickUnlockCredential();
      if (canOfferUnlock) {
        setPendingRoute(nextRoute);
        setOfferUnlock(true);
      } else {
        navigate(nextRoute, { replace: true });
      }
    } catch (err) {
      setError(extractErrorMessage(err, "That code didn't work. Please try again."));
      setDigits(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    try {
      const result = await authApi.requestOtp(phone);
      resend.cancel();
      resend.start();
      setDigits(Array(6).fill(""));
      setError(null);
      if (result.devCode) inputRefs.current[0]?.focus();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const enableUnlock = async () => {
    const session = useAuthStore.getState().session;
    if (session) {
      const ok = await registerQuickUnlock(session.userId, phone);
      if (ok) setQuickUnlockEnabled(true);
    }
    setOfferUnlock(false);
    if (pendingRoute) navigate(pendingRoute, { replace: true });
  };

  const skipUnlock = () => {
    setOfferUnlock(false);
    if (pendingRoute) navigate(pendingRoute, { replace: true });
  };

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-canvas safe-top safe-bottom px-7">
      <button onClick={() => navigate(-1)} aria-label="Back" className="mt-4 grid h-10 w-10 place-items-center rounded-full bg-card-elevated text-body">
        <ArrowLeft size={18} />
      </button>

      <div className="mt-6 flex flex-1 flex-col justify-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}>
          <h1 className="font-display text-[26px] font-extrabold leading-tight text-body">Enter verification code</h1>
          <p className="mt-2 text-[15px] text-muted">
            We sent a 6-digit code to <span className="font-semibold text-body">{formatNigerianPhone(phone)}</span>
          </p>

          {devCode && (
            <div className="mt-4 rounded-2xl bg-tint-warning px-4 py-2.5 text-xs font-semibold text-[#a86a00] dark:text-warning">
              Dev mode code: {devCode}
            </div>
          )}

          <div className="mt-8 flex justify-between gap-2">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                inputMode="numeric"
                maxLength={1}
                className="h-14 w-12 rounded-2xl border border-subtle bg-card-elevated text-center text-xl font-bold text-body outline-none focus:border-accent"
              />
            ))}
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-tint-primary px-4 py-3 text-sm text-primary">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            fullWidth
            size="lg"
            className="mt-8"
            loading={verifying}
            disabled={code.length !== 6}
            onClick={() => verify(code)}
          >
            Verify & Continue
          </Button>

          <div className="mt-6 text-center text-sm">
            {resend.running ? (
              <span className="text-faint">Resend code in 0:{String(resend.remaining).padStart(2, "0")}</span>
            ) : (
              <button onClick={handleResend} className="font-semibold text-accent">
                Resend code
              </button>
            )}
          </div>
        </motion.div>
      </div>

      <Sheet open={offerUnlock} onClose={skipUnlock} title="Enable Quick Unlock">
        <div className="flex flex-col items-center gap-4 pb-2 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-tint-accent text-accent">
            <Fingerprint size={30} />
          </div>
          <p className="text-sm text-muted">
            Use Face ID or your fingerprint to open Stignit instantly next time, instead of a code. This stays on
            your device only.
          </p>
          <Button fullWidth size="lg" onClick={enableUnlock}>
            Enable Quick Unlock
          </Button>
          <button onClick={skipUnlock} className="text-sm font-semibold text-muted">
            Not now
          </button>
        </div>
      </Sheet>
    </div>
  );
}
