import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, getApiBaseUrl } from '../../lib/api';
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const errorParam = params.get('error');
    if (token) {
      setAuth(token, '');
      const returnTo = params.get('returnTo') ?? '/checkout';
      window.history.replaceState({}, '', window.location.pathname);
      window.location.href = returnTo;
      return;
    }
    if (errorParam) {
      setError('root', { message: decodeURIComponent(errorParam).replace(/\+/g, ' ') });
    }
  }, [setAuth, setError]);

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
      <div className="relative my-4">
        <span className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-sand dark:border-charcoal-light" />
        </span>
        <span className="relative flex justify-center text-xs uppercase text-charcoal/60 dark:text-cream/60">
          Or
        </span>
      </div>
      <a
        href={`${getApiBaseUrl().replace(/\/$/, '')}/auth/google?context=store`}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-sand dark:border-charcoal-light bg-cream dark:bg-ink py-2.5 text-charcoal dark:text-cream font-medium hover:opacity-90"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Sign in with Google
      </a>
      <p className="text-center text-sm text-charcoal/70 dark:text-cream/70">
        <a href="/forgot-password" className="text-emerald hover:text-emerald-light font-medium">
          Forgot password?
        </a>
      </p>
      <p className="text-center text-sm text-charcoal/70 dark:text-cream/70">
        Don&apos;t have an account?{' '}
        <a href="/register" className="text-emerald hover:text-emerald-light font-medium">
          Sign up
        </a>
      </p>
    </form>
  );
}
