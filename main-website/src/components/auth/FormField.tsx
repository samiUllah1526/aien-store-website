import type { InputHTMLAttributes, Ref, ReactNode } from 'react';

/**
 * Editorial bottom-border input — matches the shop filter rail and the rest of
 * the AIEN system. Use for non-password fields. For passwords use
 * `PasswordField` (same shell + visibility toggle).
 *
 * React 19 idiom: `ref` is accepted as a regular prop (no `forwardRef`).
 * `react-hook-form`'s `register()` spread (`{ name, ref, onChange, onBlur }`)
 * works directly because every key is just a normal prop now.
 */
type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  ref?: Ref<HTMLInputElement>;
};

export function FormField({
  label,
  hint,
  error,
  optional,
  id,
  name,
  ref,
  className = '',
  ...rest
}: FormFieldProps) {
  const inputId = id ?? name;
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="flex items-center justify-between font-sans text-label-caps text-on-surface-variant"
      >
        <span>{label}</span>
        {optional && <span className="text-on-surface-variant/60 normal-case tracking-normal text-form-hint">Optional</span>}
      </label>
      <div
        className={`border-b transition-colors ${
          error
            ? 'border-red-500'
            : 'border-outline-variant focus-within:border-primary'
        }`}
      >
        <input
          {...rest}
          ref={ref}
          id={inputId}
          name={name}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          className={`w-full bg-transparent border-0 py-3 text-body-md text-on-background placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-0 ${className}`}
        />
      </div>
      {hint && !error && (
        <p id={`${inputId}-hint`} className="font-sans text-form-hint text-on-surface-variant">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} role="alert" className="font-sans text-form-hint text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
