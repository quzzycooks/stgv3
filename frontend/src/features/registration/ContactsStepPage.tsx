import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, Reorder } from "framer-motion";
import { GripVertical, Plus, Trash2, UserPlus } from "lucide-react";
import { RegistrationHeader } from "./RegistrationHeader";
import { Sheet } from "@/components/ui/Sheet";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useRegistrationStore } from "@/stores/registrationStore";
import { contactSchema, type ContactFormValues } from "@/lib/schemas/registration";
import { toE164 } from "@/lib/schemas/auth";
import type { EmergencyContactInput } from "@/api/types";

const MIN_CONTACTS = 2;
const MAX_CONTACTS = 4;

export function ContactsStepPage() {
  const navigate = useNavigate();
  const { emergencyContacts, setEmergencyContacts } = useRegistrationStore();
  const [sheetOpen, setSheetOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({ resolver: zodResolver(contactSchema) });

  const addContact = (values: ContactFormValues) => {
    const next: EmergencyContactInput = {
      name: values.name,
      phone: toE164(values.localNumber),
      relationship: values.relationship,
      priority: emergencyContacts.length + 1,
    };
    setEmergencyContacts([...emergencyContacts, next]);
    reset();
    setSheetOpen(false);
  };

  const removeContact = (index: number) => {
    const next = emergencyContacts.filter((_, i) => i !== index).map((c, i) => ({ ...c, priority: i + 1 }));
    setEmergencyContacts(next);
  };

  const canContinue = emergencyContacts.length >= MIN_CONTACTS;

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-canvas safe-bottom">
      <RegistrationHeader step={1} backTo="/register/identity" />

      <div className="flex flex-1 flex-col px-6 pt-6">
        <h1 className="font-display text-2xl font-extrabold text-body">Who should we alert?</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          Add {MIN_CONTACTS}–{MAX_CONTACTS} people to notify the moment a Situation Room opens for you. Drag to set priority.
        </p>

        <Reorder.Group
          axis="y"
          values={emergencyContacts}
          onReorder={(next) => setEmergencyContacts(next.map((c, i) => ({ ...c, priority: i + 1 })))}
          className="mt-6 flex flex-col gap-3"
        >
          {emergencyContacts.map((contact, i) => (
            <Reorder.Item
              key={contact.phone}
              value={contact}
              className="flex items-center gap-3 rounded-2xl border border-subtle bg-card-elevated px-4 py-3.5 shadow-card"
            >
              <GripVertical size={16} className="shrink-0 text-faint" />
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tint-primary text-xs font-bold text-primary">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-body">{contact.name}</p>
                <p className="truncate text-xs text-muted">
                  {contact.relationship} · {contact.phone}
                </p>
              </div>
              <button onClick={() => removeContact(i)} aria-label={`Remove ${contact.name}`} className="shrink-0 text-faint">
                <Trash2 size={17} />
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {emergencyContacts.length < MAX_CONTACTS && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setSheetOpen(true)}
            className="mt-3 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border-strong)] py-4 text-sm font-semibold text-accent"
          >
            <UserPlus size={17} /> Add emergency contact
          </motion.button>
        )}

        <div className="flex-1" />
        <Button size="lg" fullWidth disabled={!canContinue} className="mt-8 mb-6" onClick={() => navigate("/register/medical")}>
          {canContinue ? "Continue" : `Add ${MIN_CONTACTS - emergencyContacts.length} more contact${MIN_CONTACTS - emergencyContacts.length === 1 ? "" : "s"}`}
        </Button>
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Add emergency contact">
        <form onSubmit={handleSubmit(addContact)} className="flex flex-col gap-4">
          <Input label="Full name" placeholder="Chinedu Okafor" error={errors.name?.message} {...register("name")} />
          <Input
            label="Phone number"
            type="tel"
            inputMode="numeric"
            placeholder="801 234 5678"
            icon={<span className="text-sm font-semibold text-body">+234</span>}
            error={errors.localNumber?.message}
            {...register("localNumber")}
          />
          <Input label="Relationship" placeholder="Sister, Father, Friend..." error={errors.relationship?.message} {...register("relationship")} />
          <Button type="submit" size="lg" fullWidth icon={<Plus size={18} />}>
            Add contact
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
