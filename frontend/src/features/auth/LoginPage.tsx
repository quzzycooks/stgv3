import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, Mail, ShieldHalf, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authApi } from "@/api/auth";
import { extractErrorMessage } from "@/api/client";
import { phoneSchema, toE164, type PhoneFormValues } from "@/lib/schemas/auth";
import { emailSchema, type EmailFormValues } from "@/lib/schemas/auth";

type Channel = "phone" | "email";

export function LoginPage() {
  const navigate = useNavigate();
  const [channel, setChannel] = useState<Channel>("phone");
  const [serverError, setServerError] = useState<string | null>(null);

  const phoneForm = useForm<PhoneFormValues>({ resolver: zodResolver(phoneSchema) });
  const emailForm = useForm<EmailFormValues>({ resolver: zodResolver(emailSchema) });

  const switchChannel = (next: Channel) => {
    if (next === channel) return;
    setServerError(null);
    setChannel(next);
  };

  const onSubmitPhone = async (values: PhoneFormValues) => {
    setServerError(null);
    const phone = toE164(values.localNumber);
    try {
      const result = await authApi.requestOtp(phone);
      navigate("/login/otp", {
        state: { channel: "phone", phone, resendInSec: result.resendInSec, devCode: result.devCode },
      });
    } catch (error) {
      setServerError(extractErrorMessage(error, "Couldn't send the code. Please try again."));
    }
  };

  const onSubmitEmail = async (values: EmailFormValues) => {
    setServerError(null);
    try {
      const result = await authApi.requestEmailOtp(values.email);
      navigate("/login/otp", {
        state: { channel: "email", email: values.email, resendInSec: result.resendInSec, devCode: result.devCode },
      });
    } catch (error) {
      setServerError(extractErrorMessage(error, "Couldn't send the code. Please try again."));
    }
  };

  const submitting = phoneForm.formState.isSubmitting || emailForm.formState.isSubmitting;

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-canvas safe-top safe-bottom px-7">
      <div className="flex flex-1 flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        >
          <div className="mb-8 grid h-16 w-16 place-items-center rounded-3xl bg-primary text-white shadow-glow-primary">
            <ShieldHalf size={28} />
          </div>

          <h1 className="font-display text-[28px] font-extrabold leading-tight text-body">Welcome back</h1>
          <p className="mt-2 text-[15px] text-muted">
            {channel === "phone"
              ? "Enter your phone number and we'll send a one-time code to verify it's you."
              : "Enter your email and we'll send a one-time code to verify it's you."}
          </p>

          {/* Channel toggle */}
          <div className="relative mt-6 grid grid-cols-2 rounded-2xl bg-card-elevated p-1">
            <motion.div
              className="absolute inset-y-1 w-[calc(50%-4px)] rounded-xl bg-primary shadow-[0_6px_16px_-4px_rgb(176_0_32_/_0.35)]"
              animate={{ x: channel === "phone" ? 0 : "calc(100% + 8px)" }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
            />
            <button
              type="button"
              onClick={() => switchChannel("phone")}
              className={`relative z-10 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                channel === "phone" ? "text-on-primary" : "text-muted"
              }`}
            >
              <Phone size={15} /> Phone
            </button>
            <button
              type="button"
              onClick={() => switchChannel("email")}
              className={`relative z-10 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                channel === "email" ? "text-on-primary" : "text-muted"
              }`}
            >
              <Mail size={15} /> Email
            </button>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {channel === "phone" ? (
              <motion.form
                key="phone"
                onSubmit={phoneForm.handleSubmit(onSubmitPhone)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.18 }}
                className="mt-5 flex flex-col gap-4"
              >
                <Input
                  label="Phone number"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="801 234 5678"
                  icon={
                    <span className="flex items-center gap-1.5 text-body font-semibold text-sm">
                      <Phone size={16} /> +234
                    </span>
                  }
                  error={phoneForm.formState.errors.localNumber?.message}
                  {...phoneForm.register("localNumber")}
                />

                {serverError && (
                  <div className="flex items-start gap-2 rounded-2xl bg-tint-primary px-4 py-3 text-sm text-primary">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{serverError}</span>
                  </div>
                )}

                <Button type="submit" size="lg" fullWidth loading={submitting} className="mt-2">
                  Send verification code
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="email"
                onSubmit={emailForm.handleSubmit(onSubmitEmail)}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="mt-5 flex flex-col gap-4"
              >
                <Input
                  label="Email address"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  icon={<Mail size={16} />}
                  error={emailForm.formState.errors.email?.message}
                  {...emailForm.register("email")}
                />

                {serverError && (
                  <div className="flex items-start gap-2 rounded-2xl bg-tint-primary px-4 py-3 text-sm text-primary">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{serverError}</span>
                  </div>
                )}

                <Button type="submit" size="lg" fullWidth loading={submitting} className="mt-2">
                  Send verification code
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <p className="pb-8 text-center text-xs text-faint">
        By continuing, you agree that Stignit may contact your emergency contacts and nearby responders during a
        genuine emergency.
      </p>
    </div>
  );
}
