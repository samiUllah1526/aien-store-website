import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { loginSchema, loginDefaultValues, type LoginFormData } from './authSchema';
import { FormField } from './FormField';
import { PasswordField } from './PasswordField';
import GoogleButton from './GoogleButton';

export default function LoginForm() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [remember, setRemember] = useState(true);

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
      const returnTo = params.get('returnTo') ?? '/';
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
        // Surfaced for the backend to honor when wired; safe to ignore today.
        remember,
      })) as { accessToken?: string; user?: { email?: string } };
      const token = res.accessToken;
      const userEmail = res.user?.email;
      if (!token) throw new Error('No token received');
      setAuth(token, userEmail ?? data.email);
      const returnTo =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('returnTo') ?? '/'
          : '/';
      window.location.href = returnTo;
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Login failed',
      });
    }
  };

  return (
    <form
      method="post"
      action="/login"
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-7"
    >
      {errors.root && (
        <div role="alert" className="border-l-2 border-red-500 bg-red-50 px-4 py-3 font-sans text-form-hint text-red-800">
          {errors.root.message}
        </div>
      )}

      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        {...register('email')}
        error={errors.email?.message}
      />

      <PasswordField
        label="Password"
        autoComplete="current-password"
        {...register('password')}
        error={errors.password?.message}
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer group select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 border-outline rounded-none focus:ring-0 checked:bg-primary checked:border-primary"
          />
          <span className="font-sans text-form-hint text-on-surface-variant group-hover:text-on-background">
            Remember me
          </span>
        </label>
        <a href="/forgot-password" className="link-underline">
          Forgot password?
        </a>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>

      <div className="relative" aria-hidden="true">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-outline-variant" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 font-sans text-label-caps text-on-surface-variant">
            Or
          </span>
        </div>
      </div>

      <GoogleButton label="Continue with Google" />

      <p className="text-center font-sans text-form-hint text-on-surface-variant">
        Don&apos;t have an account?{' '}
        <a href="/register" className="link-underline">
          Sign up
        </a>
      </p>
    </form>
  );
}
