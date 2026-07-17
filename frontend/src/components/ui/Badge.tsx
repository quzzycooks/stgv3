import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "primary" | "accent" | "success" | "warning" | "neutral";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  icon?: ReactNode;
  dot?: boolean;
}

const toneClasses: Record<Tone, string> = {
  primary: "bg-tint-primary text-primary",
  accent: "bg-tint-accent text-accent",
  success: "bg-tint-success text-success",
  warning: "bg-tint-warning text-[#a86a00] dark:text-warning",
  neutral: "bg-card-elevated text-muted border border-subtle",
};

const dotClasses: Record<Tone, string> = {
  primary: "bg-primary",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  neutral: "bg-faint",
};

export function Badge({ tone = "neutral", icon, dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotClasses[tone])} />}
      {icon}
      {children}
    </span>
  );
}
