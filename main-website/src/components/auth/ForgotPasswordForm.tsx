import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { forgotPasswordSchema, type ForgotPasswordFormData } from './authSchema';
import { FormField } from './FormField';

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
      <div className="space-y-6 border-l-2 border-primary pl-6 py-2">
        <p className="font-serif text-h3-section text-on-background">Check your inbox</p>
        <p className="font-sans text-body-md text-on-surface-variant max-w-prose">
          If an account exists with that email, we&apos;ve sent a password reset link.
          Check your inbox and spam folder.
        </p>
        <a href="/login" className="link-underline">
          Back to sign in
        </a>
      </div>
    );
  }

  return (
    <form
      method="post"
      action="/forgot-password"
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
        placeholder="you@example.com"
        {...register('email')}
        error={errors.email?.message}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Sending…' : 'Send reset link'}
      </button>

      <p className="text-center font-sans text-form-hint text-on-surface-variant">
        <a href="/login" className="link-underline">
          Back to sign in
        </a>
      </p>
    </form>
  );
}
