import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { User } from '../lib/types';

export function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<User>('/users/me')
      .then((res) => {
        if (!cancelled && res.data) {
          setUser(res.data);
          setFirstName(res.data.firstName ?? res.data.name?.split(' ')[0] ?? '');
          setLastName(res.data.lastName ?? (res.data.name?.split(' ').slice(1).join(' ') || '') ?? '');
          setEmail(res.data.email ?? '');
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaveSuccess(false);
    if (password.trim()) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('New password and confirm password do not match.');
        return;
      }
    }
    if (confirmPassword.trim() && !password.trim()) {
      setError('Enter a new password above if you want to change it.');
      return;
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }
    setSaving(true);
    try {
      const body: { firstName?: string; lastName?: string; email?: string; password?: string } = {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        email: trimmedEmail !== (user?.email ?? '').toLowerCase() ? trimmedEmail : undefined,
      };
      if (password.length >= 8) body.password = password;
      await api.patch<User>('/users/me', body);
      setSaveSuccess(true);
      setPassword('');
      setConfirmPassword('');
      setUser((prev) =>
        prev
          ? {
              ...prev,
              email: trimmedEmail,
              firstName: firstName.trim() || null,
              lastName: lastName.trim() || null,
              name: [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || prev.name,
            }
          : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-400" />
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300" role="alert">
        {error}
        <a href="/admin" className="ml-2 underline">Back to dashboard</a>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Your profile</h2>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300" role="alert">
            {error}
          </div>
        )}
        {saveSuccess && (
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300" role="status">
            Profile updated.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-first-name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              First name
            </label>
            <input
              id="profile-first-name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="profile-last-name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Last name
            </label>
            <input
              id="profile-last-name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        <div>
          <label htmlFor="profile-email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">You can change your email; it must not be used by another account.</p>
        </div>

        <div>
          <label htmlFor="profile-password" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            New password
          </label>
          <input
            id="profile-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current"
            minLength={8}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">At least 8 characters. Leave empty to keep your current password.</p>
        </div>

        <div>
          <label htmlFor="profile-confirm-password" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Confirm password
          </label>
          <input
            id="profile-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
          />
          {password && confirmPassword && password !== confirmPassword && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">Passwords do not match.</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-500"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <a
            href="/admin"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
