import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { registerSchema, registerDefaultValues, type RegisterFormData } from './authSchema';

const inputClass =
  'w-full rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink px-3 py-2 text-charcoal dark:text-cream focus:outline-none focus:ring-2 focus:ring-emerald/50';
const inputErrorClass = 'border-red-500 dark:border-red-400';

export default function RegisterForm() {
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: registerDefaultValues,
  });

  const onSubmit = async (data: RegisterFormData) => {
    const name = [data.firstName.trim(), data.lastName?.trim()].filter(Boolean).join(' ').trim();
    try {
      const res = (await api.post<unknown>('/auth/register', {
        name: name || data.firstName.trim(),
        email: data.email.trim(),
        password: data.password,
      })) as { accessToken?: string; user?: { email?: string } };
      const token = res.accessToken;
      const userEmail = res.user?.email;
      if (!token) throw new Error('No token received');
      setAuth(token, userEmail ?? data.email);
      const returnTo =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('returnTo') ?? '/checkout'
          : '/checkout';
      window.location.href = returnTo;
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Sign up failed',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-sm space-y-4">
      {errors.root && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-300">
          {errors.root.message}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="register-firstName" className="mb-1 block text-sm font-medium text-charcoal dark:text-cream/90">
            First name
          </label>
          <input
            id="register-firstName"
            type="text"
            autoComplete="given-name"
            {...register('firstName')}
            className={`${inputClass} ${errors.firstName ? inputErrorClass : ''}`}
          />
          {errors.firstName && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.firstName.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="register-lastName" className="mb-1 block text-sm font-medium text-charcoal dark:text-cream/90">
            Last name <span className="text-charcoal/50 dark:text-cream/50">(optional)</span>
          </label>
          <input
            id="register-lastName"
            type="text"
            autoComplete="family-name"
            {...register('lastName')}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="register-email" className="mb-1 block text-sm font-medium text-charcoal dark:text-cream/90">
          Email
        </label>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          {...register('email')}
          className={`${inputClass} ${errors.email ? inputErrorClass : ''}`}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>
        )}
      </div>
      <div>
        <label htmlFor="register-password" className="mb-1 block text-sm font-medium text-charcoal dark:text-cream/90">
          Password (min 8 characters)
        </label>
        <input
          id="register-password"
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
        <label htmlFor="register-confirmPassword" className="mb-1 block text-sm font-medium text-charcoal dark:text-cream/90">
          Confirm password
        </label>
        <input
          id="register-confirmPassword"
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
        {isSubmitting ? 'Creating account…' : 'Sign up'}
      </button>
      <p className="text-center text-sm text-charcoal/70 dark:text-cream/70">
        Already have an account?{' '}
        <a href="/login" className="text-emerald hover:text-emerald-light font-medium">
          Sign in
        </a>
      </p>
    </form>
  );
}
