import { useState } from 'react';
import { getApiBaseUrl } from '../lib/api';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const base = getApiBaseUrl().replace(/\/$/, '');
      const res = await fetch(`${base}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message || res.statusText || 'Request failed');
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center text-slate-800 dark:text-slate-200">
        <p className="text-sm">
          If an account exists with that email, we have sent a password reset link. Check your inbox and spam folder.
          The link will take you to the store to set a new password; then sign in here again.
        </p>
        <a href="/admin/login" className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:underline">
          Back to sign in
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
        <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
          placeholder="you@example.com"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-500"
      >
        {loading ? 'Sending…' : 'Send reset link'}
      </button>
      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        <a href="/admin/login" className="text-slate-700 dark:text-slate-300 hover:underline font-medium">
          Back to sign in
        </a>
      </p>
    </form>
  );
}
