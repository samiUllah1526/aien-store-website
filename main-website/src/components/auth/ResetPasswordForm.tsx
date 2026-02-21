import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { resetPasswordSchema, type ResetPasswordFormData } from './authSchema';

const inputClass =
  'w-full rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink px-3 py-2 text-charcoal dark:text-cream focus:outline-none focus:ring-2 focus:ring-emerald/50';
const inputErrorClass = 'border-red-500 dark:border-red-400';

export default function ResetPasswordForm() {
  const [token, setToken] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    setToken(params?.get('token') ?? null);
  }, []);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('root', { message: 'Missing reset token. Use the link from your email.' });
      return;
    }
    try {
      await api.post<{ message?: string }>('/auth/reset-password', {
        token,
        password: data.password,
      });
      setSuccess(true);
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Reset failed. The link may have expired. Request a new one.',
      });
    }
  };

  if (token === null) {
    return (
      <div className="mx-auto max-w-sm space-y-4 text-center text-charcoal dark:text-cream">
        <p>Loading…</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-sm space-y-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-6 text-center">
        <p className="text-charcoal dark:text-cream">
          No reset token found. Please use the link from your password reset email, or{' '}
          <a href="/forgot-password" className="text-emerald hover:text-emerald-light font-medium">
            request a new link
          </a>
          .
        </p>
        <a href="/login" className="text-emerald hover:text-emerald-light font-medium text-sm">
          Back to sign in
        </a>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-sm space-y-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-6 text-center">
        <p className="text-charcoal dark:text-cream">Your password has been reset. You can now sign in.</p>
        <a href="/login" className="inline-block rounded-lg bg-ink dark:bg-cream px-4 py-2 text-cream dark:text-ink font-medium hover:opacity-90">
          Sign in
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-sm space-y-4">
      {errors.root && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-300">
          {errors.root.message}
        </div>
      )}
      <div>
        <label htmlFor="reset-password" className="mb-1 block text-sm font-medium text-charcoal dark:text-cream/90">
          New password
        </label>
        <input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          className={`${inputClass} ${errors.password ? inputErrorClass : ''}`}
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>
        )}
      </div>
      <div>
        <label htmlFor="reset-confirm" className="mb-1 block text-sm font-medium text-charcoal dark:text-cream/90">
          Confirm password
        </label>
        <input
          id="reset-confirm"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          className={`${inputClass} ${errors.confirmPassword ? inputErrorClass : ''}`}
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-ink dark:bg-cream py-2.5 text-cream dark:text-ink font-medium hover:opacity-90 disabled:opacity-60"
      >
        {isSubmitting ? 'Resetting…' : 'Reset password'}
      </button>
      <p className="text-center text-sm text-charcoal/70 dark:text-cream/70">
        <a href="/login" className="text-emerald hover:text-emerald-light font-medium">
          Back to sign in
        </a>
      </p>
    </form>
  );
}
