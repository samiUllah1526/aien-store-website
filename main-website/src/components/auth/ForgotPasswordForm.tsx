import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { forgotPasswordSchema, type ForgotPasswordFormData } from './authSchema';

const inputClass =
  'w-full rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink px-3 py-2 text-charcoal dark:text-cream focus:outline-none focus:ring-2 focus:ring-emerald/50';
const inputErrorClass = 'border-red-500 dark:border-red-400';

export default function ForgotPasswordForm() {
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await api.post<{ message?: string }>('/auth/forgot-password', {
        email: data.email.trim(),
        context: 'store',
      });
      setSuccess(true);
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      });
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-sm space-y-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-6 text-center">
        <p className="text-charcoal dark:text-cream">
          If an account exists with that email, we have sent a password reset link. Check your inbox and spam folder.
        </p>
        <a href="/login" className="text-emerald hover:text-emerald-light font-medium text-sm">
          Back to sign in
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
        <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium text-charcoal dark:text-cream/90">
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          {...register('email')}
          className={`${inputClass} ${errors.email ? inputErrorClass : ''}`}
          placeholder="you@example.com"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-ink dark:bg-cream py-2.5 text-cream dark:text-ink font-medium hover:opacity-90 disabled:opacity-60"
      >
        {isSubmitting ? 'Sending…' : 'Send reset link'}
      </button>
      <p className="text-center text-sm text-charcoal/70 dark:text-cream/70">
        <a href="/login" className="text-emerald hover:text-emerald-light font-medium">
          Back to sign in
        </a>
      </p>
    </form>
  );
}
