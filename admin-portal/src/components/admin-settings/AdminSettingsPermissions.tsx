import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { isSuperAdmin } from '../../lib/auth';
import type { PermissionGroup } from '../../lib/types';

export default function AdminSettingsPermissions() {
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const superAdmin = isSuperAdmin();

  useEffect(() => {
    setLoading(true);
    api
      .get<PermissionGroup[]>('/roles/permissions/grouped')
      .then((res) => setGroups(res.data ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load permissions'))
      .finally(() => setLoading(false));
  }, []);

  if (!superAdmin) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 dark:border-slate-700 dark:bg-slate-800 text-center text-slate-600 dark:text-slate-400">
        You need Super Admin access to view permissions.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-8 text-center text-slate-500">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Permissions</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        All permissions in the system, grouped by category. Assign these to roles in the Roles tab.
      </p>
      <div className="space-y-6">
        {groups.map((group) => (
          <div
            key={group.category ?? 'uncategorized'}
            className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden"
          >
            <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {group.category ?? 'Other'}
              </h2>
            </div>
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {group.permissions.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between px-4 py-3 text-sm text-slate-700 dark:text-slate-300"
                >
                  <span className="font-medium">{p.name}</span>
                  {p.description && (
                    <span className="text-slate-500 dark:text-slate-400 truncate max-w-md ml-4">{p.description}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
