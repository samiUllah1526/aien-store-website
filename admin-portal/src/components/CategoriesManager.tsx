import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { api } from '../lib/api';
import { hasPermission } from '../lib/auth';
import { useDebounce } from '../hooks/useDebounce';
import type { Category } from '../lib/types';
import { useZodForm } from '../lib/forms/useZodForm';
import { mapApiErrorToForm } from '../lib/forms/mapApiErrorToForm';
import { uploadMedia } from '../lib/media-upload';

function slugFromName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function CategoriesManager() {
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput.trim(), 400);
  const [formOpen, setFormOpen] = useState<'add' | 'edit' | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const canRead = hasPermission('categories:read');
  const canWrite = hasPermission('categories:write');

  const fetchCategories = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = debouncedSearch ? { search: debouncedSearch } : undefined;
      const res = await api.get<Category[]>('/categories', params);
      setCategories(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [canRead, debouncedSearch]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleClearSearch = () => {
    setSearchInput('');
    setError(null);
  };

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-8 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="p-12 text-center">
            <div className="mx-auto h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
          </div>
        </div>
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        You don't have permission to view categories.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Categories</h1>
        {canWrite && (
          <button
            type="button"
            onClick={() => {
              setEditingCategory(null);
              setFormOpen('add');
            }}
            className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500"
          >
            Add category
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="category-search" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Search
          </label>
          <input
            id="category-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Name or description"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
          />
        </div>
        <button
          type="button"
          onClick={handleClearSearch}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Clear
        </button>
      </form>

      {loading ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Slug</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Description</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Landing</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Products</th>
                {canWrite && (
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800">
              {[1, 2, 3].map((i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
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
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          {debouncedSearch ? 'No categories match your search.' : 'No categories yet. Add one to get started.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Slug</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Landing</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Products</th>
                  {canWrite && (
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{cat.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{cat.slug}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {cat.description ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {cat.showOnLanding ? `Yes (#${cat.landingOrder ?? '—'})` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {(cat as Category & { productCount?: number }).productCount ?? 0}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(cat);
                            setFormOpen('edit');
                          }}
                          className="mr-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm(`Delete category "${cat.name}"? Products in this category will become uncategorized.`)) return;
                            setDeletingId(cat.id);
                            setError(null);
                            try {
                              await api.delete(`/categories/${cat.id}`);
                              fetchCategories();
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Delete failed');
                            } finally {
                              setDeletingId(null);
                            }
                          }}
                          disabled={deletingId === cat.id}
                          className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                        >
                          {deletingId === cat.id ? 'Deleting…' : 'Delete'}
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

      {formOpen && (
        <CategoryFormModal
          category={formOpen === 'edit' ? editingCategory : null}
          parentOptions={categories}
          onClose={() => {
            setFormOpen(null);
            setEditingCategory(null);
          }}
          onSuccess={() => {
            setFormOpen(null);
            setEditingCategory(null);
            fetchCategories();
          }}
        />
      )}
    </div>
  );
}

interface CategoryFormModalProps {
  category: Category | null;
  parentOptions: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().optional(),
  bannerImageUrl: z.string().optional(),
  showOnLanding: z.boolean().default(false),
  landingOrder: z.string().optional(),
  parentId: z.string().optional(),
});

function CategoryFormModal({ category, parentOptions, onClose, onSuccess }: CategoryFormModalProps) {
  const form = useZodForm({
    schema: categoryFormSchema,
    defaultValues: {
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      description: category?.description ?? '',
      bannerImageUrl: category?.bannerImageUrl ?? '',
      showOnLanding: category?.showOnLanding ?? false,
      landingOrder: category?.landingOrder != null ? String(category.landingOrder) : '',
      parentId: category?.parentId ?? '',
    },
  });
  const showOnLanding = form.watch('showOnLanding');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerUploadError, setBannerUploadError] = useState<string | null>(null);
  const rootError = form.formState.errors.root?.serverError?.message;

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUploadError(null);
    setUploadingBanner(true);
    try {
      const { deliveryUrl } = await uploadMedia(file, 'products');
      form.setValue('bannerImageUrl', deliveryUrl, { shouldValidate: true });
    } catch (err) {
      setBannerUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingBanner(false);
      e.target.value = '';
    }
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors('root.serverError');
    setSubmitting(true);
    try {
      const landingOrder = values.landingOrder?.trim();
      const payload = {
        name: values.name.trim(),
        slug: values.slug.trim(),
        description: values.description?.trim() || undefined,
        bannerImageUrl: values.bannerImageUrl?.trim() || (category ? null : undefined),
        showOnLanding: values.showOnLanding,
        landingOrder: landingOrder ? Number.parseInt(landingOrder, 10) : category ? null : undefined,
        parentId: values.parentId || null,
      };
      if (category) {
        await api.put(`/categories/${category.id}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      onSuccess();
    } catch (err) {
      mapApiErrorToForm(err, form.setError);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 dark:bg-black/60" aria-hidden onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {category ? 'Edit category' : 'Add category'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {rootError && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
            {rootError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cat-name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Name
            </label>
            <input
              id="cat-name"
              type="text"
              required
              {...form.register('name', {
                onChange: (e) => {
                  if (!category && !form.formState.dirtyFields.slug) {
                    form.setValue('slug', slugFromName(e.target.value), { shouldValidate: true });
                  }
                },
              })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            {form.formState.errors.name && <p className="mt-1 text-xs text-red-600">{form.formState.errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor="cat-slug" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Slug
            </label>
            <input
              id="cat-slug"
              type="text"
              required
              {...form.register('slug')}
              placeholder="e.g. shirts"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            />
            {form.formState.errors.slug && <p className="mt-1 text-xs text-red-600">{form.formState.errors.slug.message}</p>}
          </div>
          <div>
            <label htmlFor="cat-desc" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Description (optional)
            </label>
            <textarea
              id="cat-desc"
              rows={2}
              {...form.register('description')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="cat-parent" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Parent category (optional)
            </label>
            <select
              id="cat-parent"
              {...form.register('parentId')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">None</option>
              {parentOptions
                .filter((c) => !category || c.id !== category.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor="cat-banner" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Banner image URL (optional)
            </label>
            <input
              id="cat-banner"
              type="url"
              {...form.register('bannerImageUrl')}
              placeholder="https://…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={uploadingBanner}
                  onChange={handleBannerFileChange}
                />
                {uploadingBanner ? 'Uploading…' : 'Upload image'}
              </label>
            </div>
            {bannerUploadError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{bannerUploadError}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              id="cat-show-landing"
              type="checkbox"
              {...form.register('showOnLanding')}
              className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800"
            />
            <label htmlFor="cat-show-landing" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Show on storefront landing page
            </label>
          </div>
          {showOnLanding && (
            <div>
              <label htmlFor="cat-landing-order" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Landing order (lower = first)
              </label>
              <input
                id="cat-landing-order"
                type="number"
                min={0}
                {...form.register('landingOrder')}
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
              />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || uploadingBanner}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-500"
            >
              {submitting ? 'Saving…' : uploadingBanner ? 'Uploading…' : category ? 'Update' : 'Create'}
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
