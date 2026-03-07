import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { User, Role } from '../../lib/types';
import type { PermissionGroup } from '../../lib/types';
import { Modal } from '../ui/Modal';

interface EditUserPermissionsModalProps {
  user: User;
  roles: Role[];
  onClose: () => void;
  onSuccess: () => void;
}

export function EditUserPermissionsModal({ user, roles, onClose, onSuccess }: EditUserPermissionsModalProps) {
  const [roleIds, setRoleIds] = useState<string[]>(user.roleIds ?? []);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(
    () => new Set(user.directPermissionIds ?? [])
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRoleIds(user.roleIds ?? []);
    setSelectedPermissionIds(new Set(user.directPermissionIds ?? []));
  }, [user]);

  useEffect(() => {
    api.get<PermissionGroup[]>('/roles/permissions/grouped').then((res) => {
      setPermissionGroups(res.data ?? []);
    }).catch(() => setPermissionGroups([]));
  }, []);

  const toggleRole = (roleId: string) => {
    setRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const directPermissions = Array.from(selectedPermissionIds).map((permissionId) => ({
        permissionId,
        granted: true,
      }));
      await api.put(`/users/${user.id}`, {
        roleIds,
        directPermissions,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

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
          <div className="flex flex-wrap gap-3">
            {roles.map((role) => (
              <label key={role.id} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={roleIds.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-600 dark:text-slate-400"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{role.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Direct permissions (optional)</label>
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
                        checked={selectedPermissionIds.has(p.id)}
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
