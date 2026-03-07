import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { isSuperAdmin } from '../../lib/auth';
import type { RoleDetail, PermissionGroup } from '../../lib/types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';

export default function AdminSettingsRoles() {
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editingRole, setEditingRole] = useState<RoleDetail | null>(null);
  const [confirm, setConfirm] = useState<{ open: boolean; role: RoleDetail } | null>(null);

  const superAdmin = isSuperAdmin();

  const fetchRoles = useCallback(async () => {
    try {
      const res = await api.get<RoleDetail[]>('/roles');
      setRoles(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles');
      setRoles([]);
    }
  }, []);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await api.get<PermissionGroup[]>('/roles/permissions/grouped');
      setPermissionGroups(res.data ?? []);
    } catch {
      setPermissionGroups([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchRoles(), fetchPermissions()]).finally(() => setLoading(false));
  }, [fetchRoles, fetchPermissions]);

  const handleDelete = (role: RoleDetail) => {
    setConfirm({ open: true, role });
  };

  const doDelete = async () => {
    if (!confirm?.role) return;
    try {
      await api.delete(`/roles/${confirm.role.id}`);
      setConfirm(null);
      fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  if (!superAdmin) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 dark:border-slate-700 dark:bg-slate-800 text-center text-slate-600 dark:text-slate-400">
        You need Super Admin access to manage roles.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Role Management</h1>
        <button
          type="button"
          onClick={() => {
            setEditingRole(null);
            setModal('create');
          }}
          className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-700"
        >
          Create role
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
      ) : roles.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          No roles. Create one to get started.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Role</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Users</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Permissions</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{role.name}</div>
                    {role.description && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">{role.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{role.userCount}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{role.permissionCount}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRole(role);
                        setModal('edit');
                      }}
                      className="mr-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    >
                      Edit
                    </button>
                    {role.name !== 'Super Admin' && role.name !== 'Customer' && role.userCount === 0 && (
                      <button
                        type="button"
                        onClick={() => handleDelete(role)}
                        className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <RoleFormModal
          mode={modal}
          role={editingRole ?? undefined}
          permissionGroups={permissionGroups}
          onClose={() => {
            setModal(null);
            setEditingRole(null);
          }}
          onSuccess={() => {
            setModal(null);
            setEditingRole(null);
            fetchRoles();
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          open={confirm.open}
          title="Delete role"
          message={`Delete role "${confirm.role.name}"? This cannot be undone.`}
          variant="danger"
          confirmLabel="Delete"
          onConfirm={doDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

interface RoleFormModalProps {
  mode: 'create' | 'edit';
  role?: RoleDetail;
  permissionGroups: PermissionGroup[];
  onClose: () => void;
  onSuccess: () => void;
}

function RoleFormModal({ mode, role, permissionGroups, onClose, onSuccess }: RoleFormModalProps) {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [permissionIds, setPermissionIds] = useState<string[]>(role?.permissionIds ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setPermissionIds(role?.permissionIds ?? []);
  }, [role]);

  const togglePermission = (id: string) => {
    setPermissionIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'create') {
        await api.post('/roles', { name: name.trim(), description: description.trim() || undefined, permissionIds });
      } else if (role) {
        await api.put(`/roles/${role.id}`, {
          name: name.trim(),
          description: description.trim() || undefined,
          permissionIds,
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
    <Modal
      open
      title={mode === 'create' ? 'Create role' : `Edit role: ${role?.name}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Permissions</label>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-600 p-3 space-y-2">
            {permissionGroups.map((group) => (
              <div key={group.category ?? 'uncategorized'}>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {group.category ?? 'Other'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.permissions.map((p) => (
                    <label key={p.id} className="inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={permissionIds.includes(p.id)}
                        onChange={() => togglePermission(p.id)}
                        className="h-3 w-3 rounded border-slate-300 text-slate-600"
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600"
          >
            {submitting ? 'Saving…' : mode === 'create' ? 'Create' : 'Update'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
