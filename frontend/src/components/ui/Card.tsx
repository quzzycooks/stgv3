import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "flat" | "elevated" | "glass";
  padding?: "none" | "sm" | "md" | "lg";
  children: ReactNode;
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function Card({ variant = "elevated", padding = "md", className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-subtle",
        variant === "elevated" && "bg-card shadow-card",
        variant === "flat" && "bg-card",
        variant === "glass" && "bg-glass shadow-card",
        paddingClasses[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
