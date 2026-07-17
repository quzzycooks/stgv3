import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, Phone, Plus, Trash2, UserPlus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Sheet } from "@/components/ui/Sheet";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { usersApi } from "@/api/users";
import { extractErrorMessage } from "@/api/client";
import { contactSchema, type ContactFormValues } from "@/lib/schemas/registration";
import { toE164, formatNigerianPhone } from "@/lib/schemas/auth";

const MAX_CONTACTS = 4;

export function ContactsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: contacts } = useQuery({ queryKey: ["emergency-contacts"], queryFn: usersApi.listEmergencyContacts });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({ resolver: zodResolver(contactSchema) });

  const addContact = useMutation({
    mutationFn: (values: ContactFormValues) =>
      usersApi.addEmergencyContact({
        name: values.name,
        phone: toE164(values.localNumber),
        relationship: values.relationship,
        priority: (contacts?.length ?? 0) + 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergency-contacts"] });
      reset();
      setSheetOpen(false);
      setFormError(null);
    },
    onError: (err) => setFormError(extractErrorMessage(err, "Couldn't add this contact.")),
  });

  const deleteContact = useMutation({
    mutationFn: (contactId: string) => usersApi.deleteEmergencyContact(contactId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["emergency-contacts"] }),
  });

  return (
    <AppShell>
      <div className="safe-top flex items-center gap-3 px-6 pt-5">
        <button onClick={() => navigate(-1)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-card-elevated text-body">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-display text-lg font-extrabold text-body">Emergency Contacts</h1>
          <p className="text-xs text-faint">{contacts?.length ?? 0} of {MAX_CONTACTS} added</p>
        </div>
      </div>

      <div className="px-6 pt-6">
        <div className="flex flex-col gap-3">
          {contacts?.map((contact) => (
            <div key={contact.id} className="rounded-3xl border border-subtle bg-card-elevated p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-tint-primary text-sm font-bold text-primary">
                    {contact.priority}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-body">{contact.name}</p>
                    <p className="truncate text-xs text-muted">
                      {contact.relationship} · {formatNigerianPhone(contact.phoneNumber)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteContact.mutate(contact.id)}
                  aria-label={`Remove ${contact.name}`}
                  className="shrink-0 text-faint"
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {contact.verified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>}
                <div className="flex-1" />
                <a href={`tel:${contact.phoneNumber}`} className="grid h-9 w-9 place-items-center rounded-full bg-tint-accent text-accent">
                  <Phone size={15} />
                </a>
                <a href={`sms:${contact.phoneNumber}`} className="grid h-9 w-9 place-items-center rounded-full bg-tint-accent text-accent">
                  <MessageCircle size={15} />
                </a>
                <a
                  href={`https://wa.me/${contact.phoneNumber.replace("+", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="grid h-9 w-9 place-items-center rounded-full bg-tint-success text-success"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.06-1.33A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm5.2 14.2c-.22.62-1.28 1.18-1.77 1.24-.45.06-1.02.08-1.65-.1-.38-.11-.87-.28-1.5-.55-2.64-1.14-4.36-3.8-4.5-3.98-.13-.18-1.08-1.44-1.08-2.75s.68-1.94.93-2.2c.24-.27.53-.34.7-.34h.5c.16 0 .38-.06.6.45.22.53.75 1.83.82 1.96.07.13.11.29.02.47-.09.18-.14.29-.27.44-.13.16-.28.35-.4.47-.13.13-.27.27-.12.53.16.27.7 1.15 1.5 1.86 1.03.92 1.9 1.2 2.17 1.34.27.13.42.11.58-.07.16-.18.68-.79.86-1.06.18-.27.36-.22.6-.13.24.09 1.53.72 1.79.85.27.13.44.2.51.31.07.13.07.7-.15 1.31z" />
                  </svg>
                </a>
              </div>
            </div>
          ))}

          {(contacts?.length ?? 0) < MAX_CONTACTS && (
            <button
              onClick={() => setSheetOpen(true)}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border-strong)] py-4 text-sm font-semibold text-accent"
            >
              <UserPlus size={17} /> Add emergency contact
            </button>
          )}
        </div>
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Add emergency contact">
        <form onSubmit={handleSubmit((v) => addContact.mutate(v))} className="flex flex-col gap-4">
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
          {formError && <p className="text-xs font-medium text-primary">{formError}</p>}
          <Button type="submit" size="lg" fullWidth loading={addContact.isPending} icon={<Plus size={18} />}>
            Add contact
          </Button>
        </form>
      </Sheet>
    </AppShell>
  );
}
