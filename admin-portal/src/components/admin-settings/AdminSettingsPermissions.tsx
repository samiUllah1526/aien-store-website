import { useState, useEffect, useCallback, useRef } from 'react';
import { useZodForm } from '../../lib/forms/useZodForm';
import { mapApiErrorToForm } from '../../lib/forms/mapApiErrorToForm';
import { permissionCreateSchema, permissionEditSchema } from '../../lib/validation/settings';
import { api } from '../../lib/api';
import { isSuperAdmin } from '../../lib/auth';
import type { PermissionGroup, PermissionDetail } from '../../lib/types';

export default function AdminSettingsPermissions() {
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createCategoryDropdownOpen, setCreateCategoryDropdownOpen] = useState(false);
  const [createCategoryInputValue, setCreateCategoryInputValue] = useState('');
  const createCategoryDropdownRef = useRef<HTMLDivElement>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const createForm = useZodForm({
    schema: permissionCreateSchema,
    defaultValues: { name: '', description: '', category: '' },
  });
  const editForm = useZodForm({
    schema: permissionEditSchema,
    defaultValues: { description: '', category: '' },
  });

  const superAdmin = isSuperAdmin();

  const refetch = useCallback(() => {
    return api
      .get<PermissionGroup[]>('/roles/permissions/grouped')
      .then((res) => setGroups(res.data ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load permissions'));
  }, []);

  useEffect(() => {
    setLoading(true);
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  const openCreate = () => {
    createForm.reset({ name: '', description: '', category: '' });
    setCreateCategoryInputValue('');
    setCreateCategoryDropdownOpen(false);
    createForm.clearErrors();
    setCreateOpen(true);
  };

  const submitCreate = createForm.handleSubmit(async (values) => {
    setCreateSubmitting(true);
    createForm.clearErrors('root.serverError');
    try {
      await api.post<PermissionDetail>('/roles/permissions', {
        name: values.name,
        description: values.description?.trim() || undefined,
        category: values.category?.trim() || undefined,
      });
      await refetch();
      setCreateOpen(false);
    } catch (err) {
      mapApiErrorToForm(err, createForm.setError);
    } finally {
      setCreateSubmitting(false);
    }
  });

  const openEdit = (id: string, description: string | null, category: string | null) => {
    setEditingId(id);
    editForm.reset({
      description: description ?? '',
      category: category ?? '',
    });
    editForm.clearErrors();
  };

  const submitEdit = editForm.handleSubmit(async (values) => {
    if (!editingId) return;
    setEditSubmitting(true);
    editForm.clearErrors('root.serverError');
    try {
      await api.patch<PermissionDetail>(`/roles/permissions/${editingId}`, {
        description: values.description?.trim() || undefined,
        category: values.category?.trim() || undefined,
      });
      await refetch();
      setEditingId(null);
    } catch (err) {
      mapApiErrorToForm(err, editForm.setError);
    } finally {
      setEditSubmitting(false);
    }
  });

  const existingCategories = Array.from(
    new Set(groups.map((g) => g.category).filter((c): c is string => c != null))
  ).sort();

  // Close create category dropdown when clicking outside
  useEffect(() => {
    if (!createOpen || !createCategoryDropdownOpen) return;
    const el = createCategoryDropdownRef.current;
    if (!el) return;
    const handle = (e: MouseEvent) => {
      if (el.contains(e.target as Node)) return;
      setCreateCategoryDropdownOpen(false);
      setCreateCategoryInputValue(createForm.watch('category') ?? '');
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [createOpen, createCategoryDropdownOpen, createForm]);

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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Permissions</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            All permissions in the system, grouped by category. Assign these to roles in the Roles tab.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Create permission
        </button>
      </div>
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
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-slate-700 dark:text-slate-300"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <span className="font-medium">{p.name}</span>
                    {p.description && (
                      <span className="text-slate-500 dark:text-slate-400 truncate max-w-md">
                        {p.description}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(p.id, p.description, group.category)}
                    className="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Edit
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Create permission modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="create-permission-title">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-start justify-between gap-4">
              <h2 id="create-permission-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Create permission
              </h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={submitCreate} className="mt-4 space-y-4">
              <div>
                <label htmlFor="create-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="create-name"
                  type="text"
                  {...createForm.register('name')}
                  placeholder="e.g. users:read, products:write"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  autoFocus
                  disabled={createSubmitting}
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Format: resource:action (lowercase letters and numbers only)
                </p>
              </div>
              <div>
                <label htmlFor="create-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <input
                  id="create-description"
                  type="text"
                  {...createForm.register('description')}
                  placeholder="Optional"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  disabled={createSubmitting}
                />
              </div>
              <div>
                <label htmlFor="create-category" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <div ref={createCategoryDropdownRef} className="relative mt-1">
                  <input
                    id="create-category"
                    type="text"
                    value={createCategoryDropdownOpen ? createCategoryInputValue : (createForm.watch('category') ?? '')}
                    onChange={(e) => {
                      setCreateCategoryInputValue(e.target.value);
                      createForm.setValue('category', e.target.value, { shouldValidate: true });
                      setCreateCategoryDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setCreateCategoryInputValue(createForm.watch('category') ?? '');
                      setCreateCategoryDropdownOpen(true);
                    }}
                    onBlur={() => {
                      // Delay so option click registers
                      setTimeout(() => {
                        setCreateCategoryDropdownOpen(false);
                        setCreateCategoryInputValue(createForm.watch('category') ?? '');
                      }, 150);
                    }}
                    placeholder="Search or add category…"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                    disabled={createSubmitting}
                    autoComplete="off"
                  />
                  {createCategoryDropdownOpen && (
                    <ul
                      className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
                      role="listbox"
                    >
                      {existingCategories
                        .filter((c) =>
                          c.toLowerCase().includes(createCategoryInputValue.trim().toLowerCase())
                        )
                        .map((c) => (
                          <li
                            key={c}
                            role="option"
                            className="cursor-pointer px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              createForm.setValue('category', c, { shouldValidate: true });
                              setCreateCategoryInputValue(c);
                              setCreateCategoryDropdownOpen(false);
                            }}
                          >
                            {c}
                          </li>
                        ))}
                      {createCategoryInputValue.trim() &&
                        !existingCategories.some(
                          (c) => c.toLowerCase() === createCategoryInputValue.trim().toLowerCase()
                        ) && (
                          <li
                            role="option"
                            className="cursor-pointer border-t border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-400"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const newCat = createCategoryInputValue.trim();
                              createForm.setValue('category', newCat, { shouldValidate: true });
                              setCreateCategoryInputValue(newCat);
                              setCreateCategoryDropdownOpen(false);
                            }}
                          >
                            Add &quot;{createCategoryInputValue.trim()}&quot; as new category
                          </li>
                        )}
                      {existingCategories.filter((c) =>
                        c.toLowerCase().includes(createCategoryInputValue.trim().toLowerCase())
                      ).length === 0 &&
                        !createCategoryInputValue.trim() && (
                          <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                            No categories yet. Type a name and add one.
                          </li>
                        )}
                    </ul>
                  )}
                </div>
              </div>
              {createForm.formState.errors.root?.serverError?.message && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {createForm.formState.errors.root?.serverError?.message}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  disabled={createSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  disabled={createSubmitting}
                >
                  {createSubmitting ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit permission modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-permission-title">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-start justify-between gap-4">
              <h2 id="edit-permission-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Edit permission
              </h2>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Name cannot be changed. Update description and category only.
            </p>
            <form onSubmit={submitEdit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <input
                  id="edit-description"
                  type="text"
                  {...editForm.register('description')}
                  placeholder="Optional"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  disabled={editSubmitting}
                />
              </div>
              <div>
                <label htmlFor="edit-category" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <input
                  id="edit-category"
                  type="text"
                  list="edit-category-list"
                  {...editForm.register('category')}
                  placeholder="e.g. Products, Users"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  disabled={editSubmitting}
                />
                <datalist id="edit-category-list">
                  {existingCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              {editForm.formState.errors.root?.serverError?.message && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {editForm.formState.errors.root?.serverError?.message}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  disabled={editSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  disabled={editSubmitting}
                >
                  {editSubmitting ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
