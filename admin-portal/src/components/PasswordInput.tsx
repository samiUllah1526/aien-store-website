import { useState, type InputHTMLAttributes, type Ref } from 'react';

/**
 * Password input with show/hide toggle. Matches the admin portal's slate input
 * styling (`rounded-lg`, slate borders, dark-mode pairs). Use anywhere a
 * `<input type="password">` was rendered before.
 *
 * React 19 idiom: `ref` is accepted as a regular prop (no `forwardRef`).
 * Drop-in compatible with `react-hook-form`'s `register()` spread.
 */
type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  ref?: Ref<HTMLInputElement>;
};

const inputClass =
  'w-full rounded-lg border border-slate-300 pl-3 pr-10 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400';

const EyeIcon = ({ visible }: { visible: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
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

export function PasswordInput({ className = '', ref, ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...rest}
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={`${inputClass} ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-500 rounded-r-lg"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        tabIndex={0}
      >
        <EyeIcon visible={visible} />
      </button>
    </div>
  );
}
