import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { hasPermission } from '../lib/auth';
import { formatDateTime } from '../lib/format';
import type { User, Role } from '../lib/types';

const PAGE_SIZE = 10;
const STATUS_OPTIONS = ['ACTIVE', 'DISABLED'] as const;

export function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState<'add' | 'edit' | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canRead = hasPermission('users:read');
  const canWrite = hasPermission('users:write');

  const fetchRoles = useCallback(async () => {
    try {
      const res = await api.get<Role[]>('/users/roles');
      setRoles(res.data ?? []);
    } catch {
      setRoles([]);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number | undefined> = {
        page,
        limit: PAGE_SIZE,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      const res = await api.getList<User>('/users', params);
      setUsers(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [canRead, page, search, statusFilter]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  if (!canRead) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 dark:border-slate-700 dark:bg-slate-800 text-center text-slate-600 dark:text-slate-400">
        You don’t have permission to view users.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Users</h1>
        {canWrite && (
          <button
            type="button"
            onClick={() => {
              setEditingUser(null);
              setFormOpen('add');
            }}
            className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-700"
          >
            Add user
          </button>
        )}
      </div>

      <form onSubmit={handleApplyFilters} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="search" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Search
          </label>
          <input
            id="search"
            type="search"
            placeholder="Name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
          />
        </div>
        <div className="w-40">
          <label htmlFor="statusFilter" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Status
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-700"
        >
          Apply
        </button>
      </form>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Roles</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Last login</th>
                {canWrite && (
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          No users match your filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Roles</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Last login</th>
                  {canWrite && (
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{user.name}</td>
                    <td className="px-4 py-3 text-slate-700">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700">
                        {user.roles?.length
                          ? user.roles.map((r) => r.roleName).join(', ')
                          : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{formatDateTime(user.lastLoginAt)}</td>
                    {canWrite && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(user);
                            setFormOpen('edit');
                          }}
                          className="mr-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm(`Delete user "${user.email}"?`)) return;
                            setDeletingId(user.id);
                            setError(null);
                            try {
                              await api.delete(`/users/${user.id}`);
                              fetchUsers();
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Delete failed');
                            } finally {
                              setDeletingId(null);
                            }
                          }}
                          disabled={deletingId === user.id}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 text-sm font-medium"
                        >
                          {deletingId === user.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"            >
              Next
            </button>
          </div>
        </div>
      )}

      {formOpen && (
        <UserFormModal
          user={formOpen === 'edit' ? editingUser : null}
          roles={roles}
          onClose={() => {
            setFormOpen(null);
            setEditingUser(null);
          }}
          onSuccess={() => {
            setFormOpen(null);
            setEditingUser(null);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

interface UserFormModalProps {
  user: User | null;
  roles: Role[];
  onClose: () => void;
  onSuccess: () => void;
}

function UserFormModal({ user, roles, onClose, onSuccess }: UserFormModalProps) {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string>(user?.status ?? 'ACTIVE');
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(
    () => new Set(user?.roleIds ?? [])
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setPassword('');
    setStatus(user?.status ?? 'ACTIVE');
    setSelectedRoleIds(new Set(user?.roleIds ?? []));
  }, [user]);

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (user && password && password.length < 8) {
      setError('Password must be at least 8 characters if provided');
      return;
    }
    setSubmitting(true);
    try {
      if (user) {
        const body: { name?: string; password?: string; status?: string; roleIds?: string[] } = {
          name,
          status,
          roleIds: Array.from(selectedRoleIds),
        };
        if (password) body.password = password;
        await api.put<User>(`/users/${user.id}`, body);
      } else {
        await api.post<User>('/users', {
          name,
          email,
          password,
          status,
          roleIds: Array.from(selectedRoleIds),
        });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-form-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl dark:border dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <h2 id="user-form-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {user ? 'Edit user' : 'Add user'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">{error}</div>
          )}
          <div>
            <label htmlFor="user-name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Name
            </label>
            <input
              id="user-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            />
          </div>
          <div>
            <label htmlFor="user-email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              id="user-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!user}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
            />
            {user && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Email cannot be changed.</p>}
          </div>
          <div>
            <label htmlFor="user-password" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Password {user && '(leave blank to keep current)'}
            </label>
            <input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!user}
              minLength={8}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Roles</span>
            <div className="flex flex-wrap gap-3">
              {roles.map((role) => (
                <label key={role.id} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedRoleIds.has(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-600 dark:text-slate-400 focus:ring-slate-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{role.name}</span>
                </label>
              ))}
              {roles.length === 0 && (
                <span className="text-sm text-slate-500 dark:text-slate-400">No roles in the system.</span>
              )}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-500"
            >
              {submitting ? 'Saving…' : user ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
