import { useState, useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { api } from '../../lib/api';
import type { User, Role } from '../../lib/types';
import type { PermissionGroup } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { editUserPermissionsSchema } from '../../lib/validation/user';
import { useZodForm } from '../../lib/forms/useZodForm';
import { mapApiErrorToForm } from '../../lib/forms/mapApiErrorToForm';

interface EditUserPermissionsModalProps {
  user: User;
  roles: Role[];
  onClose: () => void;
  onSuccess: () => void;
}

export function EditUserPermissionsModal({ user, roles, onClose, onSuccess }: EditUserPermissionsModalProps) {
  const form = useZodForm({
    schema: editUserPermissionsSchema,
    defaultValues: {
      roleIds: user.roleIds ?? [],
      permissionIds: user.directPermissionIds ?? [],
    },
  });
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const error = form.formState.errors.root?.serverError?.message;

  useEffect(() => {
    form.reset({
      roleIds: user.roleIds ?? [],
      permissionIds: user.directPermissionIds ?? [],
    });
  }, [user]);

  useEffect(() => {
    api.get<PermissionGroup[]>('/roles/permissions/grouped').then((res) => {
      setPermissionGroups(res.data ?? []);
    }).catch(() => setPermissionGroups([]));
  }, []);

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors('root.serverError');
    setSubmitting(true);
    try {
      const directPermissions = (values.permissionIds ?? []).map((permissionId) => ({
        permissionId,
        granted: true,
      }));
      await api.put(`/users/${user.id}`, {
        roleIds: values.roleIds,
        directPermissions,
      });
      onSuccess();
    } catch (err) {
      mapApiErrorToForm(err, form.setError);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Modal open title={`Edit roles & permissions: ${user.name || user.email}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Roles</label>
          <Controller
            control={form.control}
            name="roleIds"
            render={({ field }) => (
              <div className="flex flex-wrap gap-3">
                {roles.map((role) => {
                  const roleIds = field.value ?? [];
                  const checked = roleIds.includes(role.id);
                  return (
                    <label key={role.id} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          field.onChange(
                            checked ? roleIds.filter((id: string) => id !== role.id) : [...roleIds, role.id],
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300 text-slate-600 dark:text-slate-400"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{role.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Direct permissions (optional)</label>
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
            {submitting ? 'Saving…' : 'Save'}
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
