"use client";

import { useId } from "react";

type FieldProps = {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: (props: { id: string }) => React.ReactNode;
};

// Wraps a label + control. The `children` render-prop receives a generated id
// so the label associates with the control via htmlFor.
export function Field({
  label,
  required,
  hint,
  error,
  children,
}: FieldProps) {
  const id = useId();
  return (
    <div className="block">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-zinc-700 mb-2"
      >
        {label}
        {required && (
          <span className="text-red-600 ml-1" aria-hidden>
            *
          </span>
        )}
      </label>
      {children({ id })}
      {hint && !error && (
        <p className="mt-1 text-xs text-zinc-500">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const INPUT_BASE =
  "h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-peco-secondary focus:outline-none focus:ring-2 focus:ring-peco-secondary/20";

const INPUT_ERROR =
  "h-12 w-full rounded-xl border border-red-500 bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-red-500/20";

type TextFieldProps = {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  type?: "text" | "search" | "email" | "number" | "date";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "text" | "decimal" | "numeric" | "email" | "search";
  min?: number;
  max?: number;
  step?: string | number;
  autoFocus?: boolean;
};

export function TextField({
  label,
  required,
  hint,
  error,
  type = "text",
  value,
  onChange,
  placeholder,
  inputMode,
  min,
  max,
  step,
  autoFocus,
}: TextFieldProps) {
  return (
    <Field label={label} required={required} hint={hint} error={error}>
      {({ id }) => (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          min={min}
          max={max}
          step={step}
          autoFocus={autoFocus}
          className={error ? INPUT_ERROR : INPUT_BASE}
        />
      )}
    </Field>
  );
}

type TextAreaFieldProps = {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
};

export function TextAreaField({
  label,
  required,
  hint,
  error,
  value,
  onChange,
  placeholder,
  rows = 3,
}: TextAreaFieldProps) {
  return (
    <Field label={label} required={required} hint={hint} error={error}>
      {({ id }) => (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="min-h-[96px] w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base focus:border-peco-secondary focus:outline-none focus:ring-2 focus:ring-peco-secondary/20"
        />
      )}
    </Field>
  );
}

type SelectFieldProps<T extends string> = {
  label: string;
  required?: boolean;
  hint?: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  placeholder?: string;
};

export function SelectField<T extends string>({
  label,
  required,
  hint,
  value,
  onChange,
  options,
  placeholder,
}: SelectFieldProps<T>) {
  return (
    <Field label={label} required={required} hint={hint}>
      {({ id }) => (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base focus:border-peco-secondary focus:outline-none"
        >
          {placeholder !== undefined && (
            <option value="">{placeholder}</option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}
