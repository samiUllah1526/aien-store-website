import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { loginSchema, loginDefaultValues, type LoginFormData } from './authSchema';

const inputClass =
  'w-full rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink px-3 py-2 text-charcoal dark:text-cream focus:outline-none focus:ring-2 focus:ring-emerald/50';
const inputErrorClass = 'border-red-500 dark:border-red-400';

export default function LoginForm() {
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: loginDefaultValues,
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const res = (await api.post<unknown>('/auth/login', {
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
        message: err instanceof Error ? err.message : 'Login failed',
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
      <div>
        <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-charcoal dark:text-cream/90">
          Email
        </label>
        <input
          id="login-email"
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
        <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-charcoal dark:text-cream/90">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          className={`${inputClass} ${errors.password ? inputErrorClass : ''}`}
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-ink dark:bg-cream py-2.5 text-cream dark:text-ink font-medium hover:opacity-90 disabled:opacity-60"
      >
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="text-center text-sm text-charcoal/70 dark:text-cream/70">
        Don't have an account?{' '}
        <a href="/register" className="text-emerald hover:text-emerald-light font-medium">
          Sign up
        </a>
      </p>
    </form>
  );
}
