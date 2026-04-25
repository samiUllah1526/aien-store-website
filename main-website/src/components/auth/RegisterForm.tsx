import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { registerSchema, registerDefaultValues, type RegisterFormData } from './authSchema';
import { FormField } from './FormField';
import { PasswordField } from './PasswordField';
import GoogleButton from './GoogleButton';

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
    try {
      const res = (await api.post<unknown>('/auth/register', {
        firstName: data.firstName.trim(),
        lastName: data.lastName?.trim() || undefined,
        email: data.email.trim(),
        password: data.password,
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
        message: err instanceof Error ? err.message : 'Sign up failed',
      });
    }
  };

  return (
    <div className="space-y-7">
      <GoogleButton label="Sign up with Google" />

      <div className="relative" aria-hidden="true">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-outline-variant" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 font-sans text-label-caps text-on-surface-variant">
            Or sign up with email
          </span>
        </div>
      </div>

      <form
        method="post"
        action="/register"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-7"
      >
        {errors.root && (
          <div role="alert" className="border-l-2 border-red-500 bg-red-50 px-4 py-3 font-sans text-form-hint text-red-800">
            {errors.root.message}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-7">
          <FormField
            label="First name"
            type="text"
            autoComplete="given-name"
            {...register('firstName')}
            error={errors.firstName?.message}
          />
          <FormField
            label="Last name"
            type="text"
            autoComplete="family-name"
            optional
            {...register('lastName')}
            error={errors.lastName?.message}
          />
        </div>

        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />

        <PasswordField
          label="Password"
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
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-center font-sans text-form-hint text-on-surface-variant">
          Already have an account?{' '}
          <a href="/login" className="link-underline">
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
}
