import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, trailing, className, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-muted px-0.5">
            {label}
          </label>
        )}
        <div
          className={cn(
            "flex items-center gap-2.5 h-14 rounded-2xl border bg-card-elevated px-4 transition-colors",
            error ? "border-primary" : "border-subtle focus-within:border-accent",
          )}
        >
          {icon && <span className="text-faint shrink-0">{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "flex-1 min-w-0 bg-transparent text-body placeholder:text-faint outline-none text-[15px] font-medium",
              className,
            )}
            {...props}
          />
          {trailing}
        </div>
        {error ? (
          <span className="text-xs font-medium text-primary px-0.5">{error}</span>
        ) : hint ? (
          <span className="text-xs text-faint px-0.5">{hint}</span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";
