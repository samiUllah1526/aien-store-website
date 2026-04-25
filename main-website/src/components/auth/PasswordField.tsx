import { useState, type InputHTMLAttributes, type Ref, type ReactNode } from 'react';

/**
 * Password input with show/hide toggle. Same editorial bottom-border styling
 * as `FormField`. Inline-SVG eye icon (no font dependency) and `aria-pressed`
 * on the toggle for accessibility.
 *
 * React 19 idiom: `ref` is accepted as a regular prop (no `forwardRef`).
 * `{...rest}` is spread first so our explicit `type` (driven by the visibility
 * state) always wins over any stray prop a parent might pass.
 */
type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  hint?: ReactNode;
  error?: string;
  ref?: Ref<HTMLInputElement>;
};

const EyeIcon = ({ visible }: { visible: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
    aria-hidden="true"
  >
    {visible ? (
      <>
        <path d="M3 3l18 18" />
        <path d="M10.58 10.58a2 2 0 002.83 2.83" />
        <path d="M9.88 5.09A10.94 10.94 0 0112 5c5 0 9.27 3.11 11 7-.5 1.13-1.2 2.17-2.06 3.06" />
        <path d="M6.61 6.61C4.62 7.99 3.06 9.85 2 12c1.73 3.89 6 7 11 7 1.66 0 3.22-.34 4.6-.95" />
      </>
    ) : (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

export function PasswordField({
  label,
  hint,
  error,
  id,
  name,
  ref,
  className = '',
  ...rest
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
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
        className="font-sans text-label-caps text-on-surface-variant"
      >
        {label}
      </label>
      <div
        className={`flex items-center border-b transition-colors ${
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
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          className={`flex-1 bg-transparent border-0 py-3 text-body-md text-on-background placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-0 ${className}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="px-2 py-2 text-on-surface-variant hover:text-on-background focus-ring rounded"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          tabIndex={0}
        >
          <EyeIcon visible={visible} />
        </button>
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
