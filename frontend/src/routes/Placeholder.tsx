import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Construction } from "lucide-react";

/** Temporary stand-in for screens not yet built out in this build phase. */
export function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <AppShell>
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <Card className="flex flex-col items-center gap-3 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-tint-accent text-accent">
            <Construction size={22} />
          </div>
          <h2 className="font-display text-lg font-bold text-body">{title}</h2>
          <p className="text-sm text-muted">Arriving in {phase} of the build.</p>
        </Card>
      </div>
    </AppShell>
  );
}
