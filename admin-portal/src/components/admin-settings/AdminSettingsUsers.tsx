import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../lib/api';
import { isSuperAdmin } from '../../lib/auth';
import type { User, Role } from '../../lib/types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { InviteUserModal } from './InviteUserModal';
import { EditUserPermissionsModal } from './EditUserPermissionsModal';

const PAGE_SIZE = 10;

/** Icons as inline SVG (stroke, 20x20). */
const Icons = {
  edit: (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  promote: (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ),
  demote: (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  remove: (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
};

export default function AdminSettingsUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmKeyword?: string;
    confirmKeywordLabel?: string;
    variant?: 'danger' | 'primary';
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const superAdmin = isSuperAdmin();

  const fetchRoles = useCallback(async () => {
    try {
      const res = await api.get<Role[]>('/users/roles');
      setRoles(res.data ?? []);
    } catch {
      setRoles([]);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getList<User>('/users', { page, limit: PAGE_SIZE });
      setUsers(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (!openActionsId) return;
    const close = () => {
      setOpenActionsId(null);
      setPopoverPosition(null);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openActionsId]);

  const openActions = (user: User, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (openActionsId === user.id) {
      setOpenActionsId(null);
      setPopoverPosition(null);
      return;
    }
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    const minWidth = 220;
    setPopoverPosition({
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - minWidth),
    });
    setOpenActionsId(user.id);
  };

  const openConfirm = (
    title: string,
    message: string,
    onConfirm: () => Promise<void>,
    options?: {
      variant?: 'danger' | 'primary';
      confirmLabel?: string;
      confirmKeyword?: string;
      confirmKeywordLabel?: string;
    }
  ) => {
    setConfirmError(null);
    setConfirm({
      open: true,
      title,
      message,
      onConfirm,
      variant: options?.variant,
      confirmLabel: options?.confirmLabel,
      confirmKeyword: options?.confirmKeyword,
      confirmKeywordLabel: options?.confirmKeywordLabel,
    });
  };

  const handlePromote = (user: User) => {
    openConfirm(
      'Promote to Super Admin',
      `${user.name || user.email} will get full access to invite users, manage roles and permissions, and promote or demote others. Are you sure?`,
      async () => {
        await api.post<User>(`/users/${user.id}/promote-super-admin`, {});
        setConfirm(null);
        fetchUsers();
      },
      {
        confirmLabel: 'Promote to Super Admin',
        confirmKeyword: 'PROMOTE',
        confirmKeywordLabel: 'Type PROMOTE to confirm',
      }
    );
  };

  const handleDemote = (user: User) => {
    openConfirm(
      'Demote from Super Admin',
      `Remove Super Admin role from ${user.name || user.email}? They will lose the ability to manage users, roles, and permissions.`,
      async () => {
        await api.post<User>(`/users/${user.id}/demote-super-admin`, {});
        setConfirm(null);
        fetchUsers();
      },
      {
        variant: 'danger',
        confirmLabel: 'Demote from Super Admin',
        confirmKeyword: 'DEMOTE',
        confirmKeywordLabel: 'Type DEMOTE to confirm',
      }
    );
  };

  const handleRemove = (user: User) => {
    openConfirm(
      'Remove user',
      `Permanently remove ${user.name || user.email}? This cannot be undone.`,
      async () => {
        await api.delete(`/users/${user.id}`);
        setConfirm(null);
        fetchUsers();
      },
      { variant: 'danger', confirmLabel: 'Remove user' }
    );
  };

  if (!superAdmin) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 dark:border-slate-700 dark:bg-slate-800 text-center text-slate-600 dark:text-slate-400">
        You need Super Admin access to manage users, roles, and permissions here.
      </div>
    );
  }

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">User Management</h1>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-700"
        >
          Invite user
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-8 text-center text-slate-500">
          Loading…
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          No users yet. Invite someone to get started.
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
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Permissions</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Super Admin</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{user.name}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {user.roles?.length ? user.roles.map((r) => r.roleName).join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {user.permissions?.length ?? 0} permission(s)
                    </td>
                    <td className="px-4 py-3">
                      {user.isSuperAdmin ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                          Yes
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => openActions(user, e)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                          aria-expanded={openActionsId === user.id}
                          aria-haspopup="true"
                          aria-label="Actions"
                        >
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                          </svg>
                        </button>
                        {openActionsId === user.id && popoverPosition && typeof document !== 'undefined' &&
                          createPortal(
                            <div
                              className="fixed z-[100] min-w-[220px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
                              style={{ top: popoverPosition.top, left: popoverPosition.left }}
                              role="menu"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenActionsId(null);
                                  setPopoverPosition(null);
                                  setEditUser(user);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                              >
                                {Icons.edit}
                                Edit roles & permissions
                              </button>
                              {user.isSuperAdmin ? (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenActionsId(null);
                                    setPopoverPosition(null);
                                    handleDemote(user);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-600 hover:bg-slate-50 dark:text-amber-400 dark:hover:bg-slate-700"
                                >
                                  {Icons.demote}
                                  Demote from Super Admin
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenActionsId(null);
                                    setPopoverPosition(null);
                                    handlePromote(user);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                  {Icons.promote}
                                  Promote to Super Admin
                                </button>
                              )}
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenActionsId(null);
                                  setPopoverPosition(null);
                                  handleRemove(user);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-slate-50 dark:text-red-400 dark:hover:bg-slate-700"
                              >
                                {Icons.remove}
                                Remove user
                              </button>
                            </div>,
                            document.body
                          )
                        }
                      </div>
                    </td>
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
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {inviteOpen && (
        <InviteUserModal
          roles={roles}
          onClose={() => setInviteOpen(false)}
          onSuccess={() => {
            setInviteOpen(false);
            fetchUsers();
          }}
        />
      )}

      {editUser && (
        <EditUserPermissionsModal
          user={editUser}
          roles={roles}
          onClose={() => setEditUser(null)}
          onSuccess={() => {
            setEditUser(null);
            fetchUsers();
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          open={confirm.open}
          title={confirm.title}
          message={confirm.message}
          variant={confirm.variant}
          confirmLabel={confirm.confirmLabel}
          confirmKeyword={confirm.confirmKeyword}
          confirmKeywordLabel={confirm.confirmKeywordLabel}
          loading={confirmLoading}
          error={confirmError}
          onConfirm={async () => {
            setConfirmLoading(true);
            setConfirmError(null);
            try {
              await confirm.onConfirm();
              setConfirm(null);
            } catch (err) {
              setConfirmError(err instanceof Error ? err.message : 'Action failed');
            } finally {
              setConfirmLoading(false);
            }
          }}
          onCancel={() => {
            setConfirm(null);
            setConfirmError(null);
          }}
        />
      )}
    </div>
  );
}
