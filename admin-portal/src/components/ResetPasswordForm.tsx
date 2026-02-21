import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../lib/api';

export function ResetPasswordForm() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    setToken(params?.get('token') ?? null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError('Missing reset token. Use the link from your email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const base = getApiBaseUrl().replace(/\/$/, '');
      const res = await fetch(`${base}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message || res.statusText || 'Reset failed');
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed. The link may have expired. Request a new one.');
    } finally {
      setLoading(false);
    }
  };

  if (token === null) {
    return (
      <div className="text-center text-slate-600 dark:text-slate-400 py-4">
        <p>Loading…</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="space-y-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 text-center text-slate-800 dark:text-slate-200">
        <p className="text-sm">
          No reset token found. Please use the link from your password reset email, or{' '}
          <a href="/admin/forgot-password" className="font-medium text-slate-700 dark:text-slate-300 hover:underline">
            request a new link
          </a>
          .
        </p>
        <a href="/admin/login" className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:underline">
          Back to sign in
        </a>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center text-slate-800 dark:text-slate-200">
        <p className="text-sm">Your password has been reset. You can now sign in.</p>
        <a
          href="/admin/login"
          className="inline-block rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500"
        >
          Sign in
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="reset-password" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          New password
        </label>
        <input
          id="reset-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
      <div>
        <label htmlFor="reset-confirm" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Confirm password
        </label>
        <input
          id="reset-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        {password && confirmPassword && password !== confirmPassword && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">Passwords do not match.</p>
        )}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-500"
      >
        {loading ? 'Resetting…' : 'Reset password'}
      </button>
      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        <a href="/admin/login" className="font-medium text-slate-700 dark:text-slate-300 hover:underline">
          Back to sign in
        </a>
      </p>
    </form>
  );
}
