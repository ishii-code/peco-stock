import * as React from "react";
import { PecoSpinner } from "./PecoSpinner";

export type PecoButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type PecoButtonSize = "sm" | "md" | "lg";

export interface PecoButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  variant?: PecoButtonVariant;
  size?: PecoButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<PecoButtonVariant, string> = {
  primary:
    "bg-peco-primary text-peco-text-primary hover:bg-peco-primary-dark active:bg-peco-primary-dark shadow-peco-sm",
  secondary:
    "bg-peco-secondary text-white hover:bg-peco-secondary-dark active:bg-peco-secondary-dark shadow-peco-sm",
  danger:
    "bg-peco-danger text-white hover:brightness-95 active:brightness-90 shadow-peco-sm",
  ghost:
    "bg-transparent text-peco-text-primary hover:bg-peco-gray-100",
};

const sizeClasses: Record<PecoButtonSize, string> = {
  sm: "h-11 px-4 text-sm rounded-peco-sm min-w-[44px]",
  md: "h-12 px-5 text-base rounded-peco-md min-w-[44px]",
  lg: "h-14 px-7 text-lg rounded-peco-md min-w-[44px]",
};

const spinnerColorFor: Record<PecoButtonVariant, "white" | "primary" | "gray"> = {
  primary: "gray",
  secondary: "white",
  danger: "white",
  ghost: "gray",
};

export const PecoButton = React.forwardRef<HTMLButtonElement, PecoButtonProps>(
  function PecoButton(
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      className = "",
      children,
      type,
      ...rest
    },
    ref,
  ) {
    const isDisabled = disabled || isLoading;
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        disabled={isDisabled}
        aria-busy={isLoading || undefined}
        className={[
          "inline-flex items-center justify-center gap-2 font-semibold transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-peco-primary focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? "w-full" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      >
        {isLoading ? (
          <PecoSpinner size="sm" color={spinnerColorFor[variant]} />
        ) : leftIcon ? (
          <span className="inline-flex shrink-0">{leftIcon}</span>
        ) : null}
        <span>{children}</span>
        {!isLoading && rightIcon ? (
          <span className="inline-flex shrink-0">{rightIcon}</span>
        ) : null}
      </button>
    );
  },
);

export default PecoButton;
