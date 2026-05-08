import * as React from "react";

export interface PecoSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface PecoSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  error?: string;
  helpText?: string;
  options: PecoSelectOption[];
  placeholder?: string;
  required?: boolean;
  containerClassName?: string;
}

export const PecoSelect = React.forwardRef<HTMLSelectElement, PecoSelectProps>(
  function PecoSelect(
    {
      label,
      error,
      helpText,
      options,
      placeholder,
      required,
      id,
      className = "",
      containerClassName = "",
      ...rest
    },
    ref,
  ) {
    const reactId = React.useId();
    const selectId = id ?? `peco-select-${reactId}`;
    const helpId = `${selectId}-help`;
    const errorId = `${selectId}-error`;

    return (
      <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
        {label ? (
          <label
            htmlFor={selectId}
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
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            required={required}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={
              error ? errorId : helpText ? helpId : undefined
            }
            className={[
              "h-12 w-full appearance-none bg-white pr-10 pl-4 text-base",
              "rounded-peco-md border transition-colors",
              "focus:outline-none focus:ring-2",
              error
                ? "border-peco-danger focus:border-peco-danger focus:ring-peco-danger/30"
                : "border-peco-gray-300 focus:border-peco-primary focus:ring-peco-primary/30",
              "disabled:bg-peco-gray-100 disabled:text-peco-gray-500 disabled:cursor-not-allowed",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            {...rest}
          >
            {placeholder ? (
              <option value="" disabled>
                {placeholder}
              </option>
            ) : null}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-peco-gray-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m6 8 4 4 4-4"
            />
          </svg>
        </div>
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

export default PecoSelect;
