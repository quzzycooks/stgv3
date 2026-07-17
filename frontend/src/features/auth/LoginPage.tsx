import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Phone, ShieldHalf, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authApi } from "@/api/auth";
import { extractErrorMessage } from "@/api/client";
import { phoneSchema, toE164, type PhoneFormValues } from "@/lib/schemas/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PhoneFormValues>({ resolver: zodResolver(phoneSchema) });

  const onSubmit = async (values: PhoneFormValues) => {
    setServerError(null);
    const phone = toE164(values.localNumber);
    try {
      const result = await authApi.requestOtp(phone);
      navigate("/login/otp", { state: { phone, resendInSec: result.resendInSec, devCode: result.devCode } });
    } catch (error) {
      setServerError(extractErrorMessage(error, "Couldn't send the code. Please try again."));
    }
  };

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
            Enter your phone number and we'll send a one-time code to verify it's you.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-4">
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
              error={errors.localNumber?.message}
              {...register("localNumber")}
            />

            {serverError && (
              <div className="flex items-start gap-2 rounded-2xl bg-tint-primary px-4 py-3 text-sm text-primary">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <Button type="submit" size="lg" fullWidth loading={isSubmitting} className="mt-2">
              Send verification code
            </Button>
          </form>
        </motion.div>
      </div>

      <p className="pb-8 text-center text-xs text-faint">
        By continuing, you agree that Stignit may contact your emergency contacts and nearby responders during a
        genuine emergency.
      </p>
    </div>
  );
}
