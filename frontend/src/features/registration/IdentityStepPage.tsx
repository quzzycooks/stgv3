import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, User } from "lucide-react";
import { RegistrationHeader } from "./RegistrationHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useRegistrationStore } from "@/stores/registrationStore";
import { identitySchema, type IdentityFormValues } from "@/lib/schemas/registration";
import { NIGERIAN_STATES } from "@/lib/nigerianStates";
import { resizeImageToDataUrl } from "@/lib/resizeImage";

export function IdentityStepPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { fullName, dateOfBirth, stateName, lga, profilePhotoUrl, setIdentity } = useRegistrationStore();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<IdentityFormValues>({
    resolver: zodResolver(identitySchema),
    defaultValues: { fullName, dateOfBirth, stateName, lga },
  });

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImageToDataUrl(file);
    setIdentity({ profilePhotoUrl: dataUrl });
  };

  const onSubmit = (values: IdentityFormValues) => {
    setIdentity(values);
    navigate("/register/contacts");
  };

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-canvas safe-bottom">
      <RegistrationHeader step={0} backTo="/login" />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col px-6 pt-6">
        <h1 className="font-display text-2xl font-extrabold text-body">Tell us about you</h1>
        <p className="mt-1.5 text-[15px] text-muted">This helps responders identify you accurately during an emergency.</p>

        <div className="mt-6 flex justify-center">
          <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Add profile photo" className="relative">
            <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-tint-accent text-accent border-2 border-dashed border-[var(--border-strong)]">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User size={32} />
              )}
            </div>
            <span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-accent text-white shadow-elevated">
              <Camera size={15} />
            </span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
        </div>

        <div className="mt-8 flex flex-col gap-4">
          <Input label="Full name" placeholder="Adaeze Okafor" error={errors.fullName?.message} {...register("fullName")} />

          <Input
            label="Date of birth"
            type="date"
            max={new Date().toISOString().split("T")[0]}
            error={errors.dateOfBirth?.message}
            {...register("dateOfBirth")}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted px-0.5">State</label>
            <Controller
              control={control}
              name="stateName"
              render={({ field }) => (
                <select
                  {...field}
                  className="h-14 rounded-2xl border border-subtle bg-card-elevated px-4 text-[15px] font-medium text-body outline-none focus:border-accent"
                >
                  <option value="">Select your state</option>
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.stateName && <span className="text-xs font-medium text-primary px-0.5">{errors.stateName.message}</span>}
          </div>

          <Input label="Local Government Area (LGA)" placeholder="Ikeja" error={errors.lga?.message} {...register("lga")} />
        </div>

        <div className="flex-1" />
        <Button type="submit" size="lg" fullWidth className="mt-8 mb-6">
          Continue
        </Button>
      </form>
    </div>
  );
}
