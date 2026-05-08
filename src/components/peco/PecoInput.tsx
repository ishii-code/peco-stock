import * as React from "react";

export type PecoInputType =
  | "text"
  | "number"
  | "email"
  | "password"
  | "date";

export interface PecoInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  helpText?: string;
  type?: PecoInputType;
  required?: boolean;
  containerClassName?: string;
}

export const PecoInput = React.forwardRef<HTMLInputElement, PecoInputProps>(
  function PecoInput(
    {
      label,
      error,
      helpText,
      type = "text",
      required,
      id,
      className = "",
      containerClassName = "",
      ...rest
    },
    ref,
  ) {
    const reactId = React.useId();
    const inputId = id ?? `peco-input-${reactId}`;
    const helpId = `${inputId}-help`;
    const errorId = `${inputId}-error`;

    return (
      <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
        {label ? (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-peco-gray-700"
          >
            {label}
            {required ? (
              <span className="ml-1 text-peco-danger" aria-hidden>
                *
              </span>
            ) : null}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          type={type}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={
            error ? errorId : helpText ? helpId : undefined
          }
          className={[
            "h-12 w-full px-4 text-base bg-white",
            "rounded-peco-md border transition-colors",
            "placeholder:text-peco-gray-300",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            error
              ? "border-peco-danger focus:border-peco-danger focus:ring-peco-danger/30"
              : "border-peco-gray-300 focus:border-peco-primary focus:ring-peco-primary/30",
            "disabled:bg-peco-gray-100 disabled:text-peco-gray-500 disabled:cursor-not-allowed",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...rest}
        />
        {error ? (
          <p id={errorId} className="text-sm text-peco-danger">
            {error}
          </p>
        ) : helpText ? (
          <p id={helpId} className="text-sm text-peco-gray-500">
            {helpText}
          </p>
        ) : null}
      </div>
    );
  },
);

export default PecoInput;
