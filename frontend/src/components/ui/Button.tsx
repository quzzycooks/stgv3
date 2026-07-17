import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onDragEnd" | "onDragStart" | "onAnimationStart"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary shadow-[0_12px_28px_-6px_rgb(176_0_32_/_0.35)] hover:bg-primary-dark active:scale-[0.98]",
  secondary: "bg-accent text-on-primary shadow-[0_12px_28px_-6px_rgb(25_118_210_/_0.3)] hover:bg-accent-dark active:scale-[0.98]",
  outline: "bg-transparent text-body border border-strong hover:bg-card-elevated active:scale-[0.98]",
  ghost: "bg-transparent text-body hover:bg-tint-accent active:scale-[0.98]",
  danger: "bg-primary-light text-primary hover:bg-primary hover:text-on-primary active:scale-[0.98]",
  success: "bg-success text-on-primary shadow-[0_12px_28px_-6px_rgb(46_125_50_/_0.3)] hover:brightness-95 active:scale-[0.98]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-sm gap-1.5 rounded-xl",
  md: "h-12 px-5 text-[15px] gap-2 rounded-2xl",
  lg: "h-14 px-6 text-base gap-2 rounded-2xl",
  xl: "h-16 px-8 text-lg gap-3 rounded-3xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", loading, fullWidth, icon, iconPosition = "left", className, children, disabled, ...props },
    ref,
  ) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-display font-semibold transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none select-none",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className,
        )}
        {...(props as HTMLMotionProps<"button">)}
      >
        {loading ? (
          <Loader2 className="animate-spin" size={18} strokeWidth={2.5} />
        ) : (
          <>
            {icon && iconPosition === "left" && icon}
            {children}
            {icon && iconPosition === "right" && icon}
          </>
        )}
      </motion.button>
    );
  },
);
Button.displayName = "Button";
