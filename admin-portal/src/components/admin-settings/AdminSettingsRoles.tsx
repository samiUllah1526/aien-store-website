import { useState, useEffect, useCallback } from 'react';
import { Controller } from 'react-hook-form';
import { api } from '../../lib/api';
import { isSuperAdmin } from '../../lib/auth';
import type { RoleDetail, PermissionGroup } from '../../lib/types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';
import { roleFormSchema } from '../../lib/validation/settings';
import { useZodForm } from '../../lib/forms/useZodForm';
import { mapApiErrorToForm } from '../../lib/forms/mapApiErrorToForm';

export default function AdminSettingsRoles() {
  const [mounted, setMounted] = useState(false);
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editingRole, setEditingRole] = useState<RoleDetail | null>(null);
  const [confirm, setConfirm] = useState<{ open: boolean; role: RoleDetail } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-8 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-12 text-center">
          <div className="mx-auto h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
        </div>
      </div>
    );
  }

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
  const form = useZodForm({
    schema: roleFormSchema,
    defaultValues: {
      name: role?.name ?? '',
      description: role?.description ?? '',
      permissionIds: role?.permissionIds ?? [],
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const error = form.formState.errors.root?.serverError?.message;

  useEffect(() => {
    form.reset({
      name: role?.name ?? '',
      description: role?.description ?? '',
      permissionIds: role?.permissionIds ?? [],
    });
  }, [role]);

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors('root.serverError');
    setSubmitting(true);
    try {
      if (mode === 'create') {
        await api.post('/roles', { name: values.name.trim(), description: values.description?.trim() || undefined, permissionIds: values.permissionIds });
      } else if (role) {
        await api.put(`/roles/${role.id}`, {
          name: values.name.trim(),
          description: values.description?.trim() || undefined,
          permissionIds: values.permissionIds,
        });
      }
      onSuccess();
    } catch (err) {
      mapApiErrorToForm(err, form.setError);
    } finally {
      setSubmitting(false);
    }
  });

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
            {...form.register('name')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
          <input
            type="text"
            {...form.register('description')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Permissions</label>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            {(form.watch('permissionIds') ?? []).length} of {permissionGroups.reduce((n, g) => n + g.permissions.length, 0)} selected
          </p>
          <Controller
            control={form.control}
            name="permissionIds"
            render={({ field }) => (
              <div className="max-h-[min(20rem,60vh)] space-y-4 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-600 dark:bg-slate-800/50">
                {permissionGroups.map((group) => {
                  const permissionIds = field.value ?? [];
                  const groupPermIds = group.permissions.map((p) => p.id);
                  const selectedInGroup = groupPermIds.filter((id) => permissionIds.includes(id)).length;
                  const allSelected = selectedInGroup === group.permissions.length;
                  const toggleGroup = () => {
                    if (allSelected) {
                      field.onChange(permissionIds.filter((id: string) => !groupPermIds.includes(id)));
                    } else {
                      field.onChange([
                        ...permissionIds.filter((id: string) => !groupPermIds.includes(id)),
                        ...groupPermIds,
                      ]);
                    }
                  };
                  return (
                    <div
                      key={group.category ?? 'uncategorized'}
                      className="rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-700">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {group.category ?? 'Other'}
                        </span>
                        <button
                          type="button"
                          onClick={toggleGroup}
                          className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                          {allSelected ? 'Deselect all' : 'Select all'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 p-3 sm:grid-cols-2">
                        {group.permissions.map((p) => (
                          <label
                            key={p.id}
                            className="flex cursor-pointer items-start gap-2 rounded py-1.5 pr-2 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                          >
                            <input
                              type="checkbox"
                              checked={permissionIds.includes(p.id)}
                              onChange={() =>
                                field.onChange(
                                  permissionIds.includes(p.id)
                                    ? permissionIds.filter((id: string) => id !== p.id)
                                    : [...permissionIds, p.id],
                                )
                              }
                              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-slate-600 focus:ring-slate-500 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-400"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {p.name}
                              </span>
                              {p.description && (
                                <span
                                  className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400"
                                  title={p.description}
                                >
                                  {p.description}
                                </span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          />
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
