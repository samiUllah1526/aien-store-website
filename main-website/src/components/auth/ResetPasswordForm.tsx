import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { resetPasswordSchema, type ResetPasswordFormData } from './authSchema';
import { PasswordField } from './PasswordField';

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
        message: err instanceof Error
          ? err.message
          : 'Reset failed. The link may have expired. Request a new one.',
      });
    }
  };

  if (token === null) {
    return (
      <p className="font-sans text-body-md text-on-surface-variant">Loading…</p>
    );
  }

  if (!token) {
    return (
      <div className="space-y-6 border-l-2 border-on-surface-variant pl-6 py-2">
        <p className="font-serif text-h3-section text-on-background">Reset link not found</p>
        <p className="font-sans text-body-md text-on-surface-variant max-w-prose">
          Please use the link from your password reset email, or{' '}
          <a href="/forgot-password" className="link-underline">request a new link</a>.
        </p>
        <a href="/login" className="link-underline">
          Back to sign in
        </a>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-6 border-l-2 border-primary pl-6 py-2">
        <p className="font-serif text-h3-section text-on-background">Password updated</p>
        <p className="font-sans text-body-md text-on-surface-variant max-w-prose">
          Your password has been reset. You can now sign in with your new credentials.
        </p>
        <a href="/login" className="btn-primary inline-flex">
          Sign in
        </a>
      </div>
    );
  }

  return (
    <form
      method="post"
      action="/reset-password"
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-7"
    >
      {errors.root && (
        <div role="alert" className="border-l-2 border-red-500 bg-red-50 px-4 py-3 font-sans text-form-hint text-red-800">
          {errors.root.message}
        </div>
      )}

      <PasswordField
        label="New password"
        autoComplete="new-password"
        hint="At least 8 characters, including a letter and a number."
        {...register('password')}
        error={errors.password?.message}
      />

      <PasswordField
        label="Confirm password"
        autoComplete="new-password"
        {...register('confirmPassword')}
        error={errors.confirmPassword?.message}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Resetting…' : 'Reset password'}
      </button>

      <p className="text-center font-sans text-form-hint text-on-surface-variant">
        <a href="/login" className="link-underline">
          Back to sign in
        </a>
      </p>
    </form>
  );
}
