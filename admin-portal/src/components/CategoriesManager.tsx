import { useState, useEffect, useCallback, useRef } from 'react';
import { z } from 'zod';
import { Controller } from 'react-hook-form';
import { api } from '../lib/api';
import { hasPermission } from '../lib/auth';
import type { ProductListItem } from '../lib/types';
import { toastSuccess } from '../lib/toast';
import { SearchableMultiSelect } from './SearchableMultiSelect';
import { useDebounce } from '../hooks/useDebounce';
import type { Category } from '../lib/types';
import { useZodForm } from '../lib/forms/useZodForm';
import { mapApiErrorToForm } from '../lib/forms/mapApiErrorToForm';
import { uploadMedia } from '../lib/media-upload';
import { AdminImagePreviewModal } from './AdminImagePreviewModal';
import { ImageCropModal, ASPECT_BANNER } from './ImageCropModal';
import { resolveAdminImageUrl } from '../lib/resolveImageUrl';
import { RichTextEditor } from './RichTextEditor';
import { CategoryTabs, type CategoryTab } from './CategoryTabs';

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
  highlights: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'Highlight cannot be empty')
        .max(120, 'Highlight must be 120 characters or fewer'),
    )
    .max(20, 'You can add up to 20 highlights')
    .default([]),
  bannerImageUrl: z.string().optional(),
  showOnLanding: z.boolean().default(false),
  landingOrder: z.string().optional(),
  parentId: z.string().optional(),
});

function CategoryFormModal({ category, onClose, onSuccess }: CategoryFormModalProps) {
  const canAssignProducts =
    !!category && hasPermission('categories:write') && hasPermission('products:read');

  const form = useZodForm({
    schema: categoryFormSchema,
    defaultValues: {
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      description: category?.description ?? '',
      highlights: category?.highlights ?? [],
      bannerImageUrl: category?.bannerImageUrl ?? '',
      showOnLanding: category?.showOnLanding ?? false,
      landingOrder: category?.landingOrder != null ? String(category.landingOrder) : '',
      parentId: category?.parentId ?? '',
    },
  });
  const showOnLanding = form.watch('showOnLanding');
  const bannerImageUrl = form.watch('bannerImageUrl');
  const highlights = form.watch('highlights') ?? [];
  const [activeTab, setActiveTab] = useState<CategoryTab>('basics');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerUploadError, setBannerUploadError] = useState<string | null>(null);
  const [bannerPreviewOpen, setBannerPreviewOpen] = useState(false);
  const [bannerCropOpen, setBannerCropOpen] = useState(false);
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null);
  const [bannerCropSourceFile, setBannerCropSourceFile] = useState<File | null>(null);
  const [bannerCropApplying, setBannerCropApplying] = useState(false);
  const [bannerDragOver, setBannerDragOver] = useState(false);
  const bannerCropUrlRef = useRef<string | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);
  const rootError = form.formState.errors.root?.serverError?.message;
  const bannerDisplayUrl = resolveAdminImageUrl(bannerImageUrl?.trim());

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const fetchCategoryMembers = useCallback(async () => {
    if (!category?.id) return;
    setMembersLoading(true);
    try {
      const res = await api.getList<ProductListItem>('/products', {
        categoryId: category.id,
        limit: 100,
        page: 1,
        sortBy: 'name',
        sortOrder: 'asc',
      });
      setSelectedProductIds((res.data ?? []).map((p) => p.id));
    } catch {
      setSelectedProductIds([]);
    } finally {
      setMembersLoading(false);
    }
  }, [category?.id]);

  useEffect(() => {
    if (category?.id && canAssignProducts) {
      void fetchCategoryMembers();
    } else {
      setSelectedProductIds([]);
    }
  }, [category?.id, canAssignProducts, fetchCategoryMembers]);

  const fetchProductsForPicker = useCallback(async ({ search, page }: { search: string; page: number }) => {
    const res = await api.getList<ProductListItem>('/products', {
      search: search || undefined,
      page,
      limit: 20,
      sortBy: 'name',
      sortOrder: 'asc',
    });
    const limit = 20;
    const total = res.meta?.total ?? 0;
    const hasMore = page * limit < total;
    const items = (res.data ?? []).map((p) => ({ id: p.id, label: p.name }));
    return { items, hasMore };
  }, []);

  const closeBannerCrop = useCallback(() => {
    if (bannerCropUrlRef.current) {
      URL.revokeObjectURL(bannerCropUrlRef.current);
      bannerCropUrlRef.current = null;
    }
    setBannerCropOpen(false);
    setBannerCropSrc(null);
    setBannerCropSourceFile(null);
  }, []);

  const openBannerCrop = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        setBannerUploadError('Please choose an image file.');
        return;
      }
      setBannerUploadError(null);
      if (bannerCropUrlRef.current) URL.revokeObjectURL(bannerCropUrlRef.current);
      const url = URL.createObjectURL(file);
      bannerCropUrlRef.current = url;
      setBannerCropSrc(url);
      setBannerCropSourceFile(file);
      setBannerCropOpen(true);
    },
    [],
  );

  const handleBannerCropApply = async (croppedFile: File) => {
    setBannerCropApplying(true);
    setBannerUploadError(null);
    try {
      closeBannerCrop();
      setUploadingBanner(true);
      const { deliveryUrl } = await uploadMedia(croppedFile, 'products');
      form.setValue('bannerImageUrl', deliveryUrl, { shouldValidate: true });
    } catch (err) {
      setBannerUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingBanner(false);
      setBannerCropApplying(false);
    }
  };

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) openBannerCrop(file);
  };

  const handleBannerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setBannerDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) openBannerCrop(file);
  };

  const handleSubmit = form.handleSubmit(
    async (values) => {
      form.clearErrors('root.serverError');
      setSubmitting(true);
      try {
        const landingOrder = values.landingOrder?.trim();
        const cleanedHighlights = (values.highlights ?? [])
          .map((h) => h.trim())
          .filter((h) => h.length > 0);
        const payload: Record<string, unknown> = {
          name: values.name.trim(),
          slug: values.slug.trim(),
          description: values.description?.trim() || undefined,
          highlights: cleanedHighlights,
          bannerImageUrl: values.bannerImageUrl?.trim() || (category ? null : undefined),
          showOnLanding: values.showOnLanding,
          landingOrder: landingOrder ? Number.parseInt(landingOrder, 10) : category ? null : undefined,
          parentId: values.parentId || null,
        };
        if (category && canAssignProducts) {
          payload.productIds = [...new Set(selectedProductIds)];
        }
        if (category) {
          await api.put(`/categories/${category.id}`, payload);
        } else {
          await api.post('/categories', payload);
        }
        toastSuccess('Category saved.');
        onSuccess();
      } catch (err) {
        mapApiErrorToForm(err, form.setError);
      } finally {
        setSubmitting(false);
      }
    },
    (errs) => {
      // Jump to the first tab with a validation error so the user can see what to fix.
      if (errs.name || errs.slug) setActiveTab('basics');
      else if (errs.description || errs.highlights) setActiveTab('content');
      else if (errs.bannerImageUrl || errs.landingOrder) setActiveTab('placement');
    },
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 dark:bg-black/60" aria-hidden onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
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
        <CategoryTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasErrors={{
            basics: Boolean(form.formState.errors.name || form.formState.errors.slug),
            content: Boolean(
              form.formState.errors.description || form.formState.errors.highlights,
            ),
            placement: Boolean(
              form.formState.errors.bannerImageUrl || form.formState.errors.landingOrder,
            ),
            products: false,
          }}
        />
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basics tab */}
          <div
            role="tabpanel"
            id="cat-panel-basics"
            aria-labelledby="cat-tab-basics"
            hidden={activeTab !== 'basics'}
            className="space-y-4"
          >
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
            <input type="hidden" {...form.register('parentId')} />
          </div>

          {/* Content tab */}
          <div
            role="tabpanel"
            id="cat-panel-content"
            aria-labelledby="cat-tab-content"
            hidden={activeTab !== 'content'}
            className="space-y-6"
          >
            <div>
              <label htmlFor="cat-desc" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Description (optional)
              </label>
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                Shown above the product grid on the storefront category page. Use bold, links, and lists sparingly.
              </p>
              <Controller
                control={form.control}
                name="description"
                render={({ field }) => (
                  <RichTextEditor
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="Tell customers what this collection is about…"
                  />
                )}
              />
              {form.formState.errors.description && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.description.message}</p>
              )}
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Feature highlights (optional)
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {highlights.length}/20
                </span>
              </div>
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                Short bullet points (max 120 chars each). When present, they render in a second column next to the description on the storefront.
              </p>
              {highlights.length === 0 ? (
                <p className="mb-2 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
                  No highlights yet. The description will display centered on the storefront.
                </p>
              ) : (
                <ul className="mb-2 space-y-2">
                  {highlights.map((value, idx) => {
                    const itemError = Array.isArray(form.formState.errors.highlights)
                      ? form.formState.errors.highlights[idx]
                      : undefined;
                    return (
                      <li key={idx} className="flex items-start gap-2">
                        <input
                          type="text"
                          value={value}
                          maxLength={120}
                          onChange={(e) => {
                            const next = highlights.slice();
                            next[idx] = e.target.value;
                            form.setValue('highlights', next, { shouldValidate: true, shouldDirty: true });
                          }}
                          placeholder={`Highlight ${idx + 1}`}
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
                          aria-label={`Highlight ${idx + 1}`}
                          aria-invalid={Boolean(itemError)}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = highlights.filter((_, i) => i !== idx);
                            form.setValue('highlights', next, { shouldValidate: true, shouldDirty: true });
                          }}
                          className="shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                          aria-label={`Remove highlight ${idx + 1}`}
                        >
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <button
                type="button"
                disabled={highlights.length >= 20}
                onClick={() => {
                  if (highlights.length >= 20) return;
                  form.setValue('highlights', [...highlights, ''], { shouldDirty: true });
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                + Add highlight
              </button>
              {form.formState.errors.highlights && !Array.isArray(form.formState.errors.highlights) && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.highlights.message}</p>
              )}
              {Array.isArray(form.formState.errors.highlights) &&
                form.formState.errors.highlights.some(Boolean) && (
                  <ul className="mt-1 space-y-1">
                    {form.formState.errors.highlights.map((e, i) =>
                      e?.message ? (
                        <li key={i} className="text-xs text-red-600">
                          Highlight {i + 1}: {e.message}
                        </li>
                      ) : null,
                    )}
                  </ul>
                )}
            </div>
          </div>

          {/* Placement tab */}
          <div
            role="tabpanel"
            id="cat-panel-placement"
            aria-labelledby="cat-tab-placement"
            hidden={activeTab !== 'placement'}
            className="space-y-4"
          >
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Banner image (optional)
              </span>
            <input
              ref={bannerFileInputRef}
              id="cat-banner-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={uploadingBanner || bannerCropOpen}
              onChange={handleBannerFileChange}
            />
            {bannerDisplayUrl ? (
              <>
                <button
                  type="button"
                  onClick={() => setBannerPreviewOpen(true)}
                  className="mb-3 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-0 text-left dark:border-slate-600 dark:bg-slate-900/40 cursor-zoom-in"
                  aria-label="View banner full size"
                >
                  <img src={bannerDisplayUrl} alt="" className="max-h-40 w-full object-contain" />
                </button>
                <details className="mt-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-600 dark:bg-slate-800/50">
                  <summary className="cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-300">
                    Set image URL manually
                  </summary>
                  <input
                    id="cat-banner"
                    type="url"
                    {...form.register('bannerImageUrl')}
                    placeholder="https://…"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
                  />
                </details>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={uploadingBanner || bannerCropOpen}
                    onClick={() => bannerFileInputRef.current?.click()}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {uploadingBanner ? 'Uploading…' : bannerCropOpen ? 'Cropping…' : 'Replace image'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      form.setValue('bannerImageUrl', '', { shouldValidate: true, shouldDirty: true });
                    }}
                    className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Remove banner
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (!uploadingBanner && !bannerCropOpen) bannerFileInputRef.current?.click();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (!uploadingBanner && !bannerCropOpen) bannerFileInputRef.current?.click();
                    }
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setBannerDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setBannerDragOver(false);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'copy';
                  }}
                  onDrop={handleBannerDrop}
                  className={`mb-3 flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
                    bannerDragOver
                      ? 'border-slate-500 bg-slate-100 dark:border-slate-400 dark:bg-slate-700/50'
                      : 'border-slate-300 bg-slate-50/80 hover:border-slate-400 hover:bg-slate-100/80 dark:border-slate-600 dark:bg-slate-800/40 dark:hover:border-slate-500 dark:hover:bg-slate-800/70'
                  } ${uploadingBanner || bannerCropOpen ? 'pointer-events-none opacity-60' : ''}`}
                >
                  {uploadingBanner ? (
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Uploading…</span>
                  ) : (
                    <>
                      <svg
                        className="h-10 w-10 text-slate-400 dark:text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Drag and drop an image here</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">or click to browse — JPEG, PNG, WebP, GIF</p>
                    </>
                  )}
                </div>
                <details className="mt-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-600 dark:bg-slate-800/50">
                  <summary className="cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-300">
                    Set image URL manually
                  </summary>
                  <input
                    id="cat-banner"
                    type="url"
                    {...form.register('bannerImageUrl')}
                    placeholder="https://…"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
                  />
                </details>
              </>
            )}
            {bannerUploadError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{bannerUploadError}</p>
            )}
            <AdminImagePreviewModal
              open={bannerPreviewOpen}
              onClose={() => setBannerPreviewOpen(false)}
              images={bannerDisplayUrl ? [bannerDisplayUrl] : []}
              initialIndex={0}
            />
            <ImageCropModal
              open={bannerCropOpen}
              imageSrc={bannerCropSrc}
              sourceFile={bannerCropSourceFile}
              aspect={ASPECT_BANNER}
              title="Crop category banner"
              onCancel={closeBannerCrop}
              onApply={handleBannerCropApply}
              applying={bannerCropApplying}
            />
            </div>
            <div className="flex items-center gap-2 pt-2">
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
          </div>

          {/* Products tab */}
          <div
            role="tabpanel"
            id="cat-panel-products"
            aria-labelledby="cat-tab-products"
            hidden={activeTab !== 'products'}
            className="space-y-4"
          >
            {!category ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
                After you create this category, edit it to assign products from here or from each product&apos;s page.
              </div>
            ) : !canAssignProducts ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You don&apos;t have permission to assign products to categories.
              </p>
            ) : membersLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading products…</p>
            ) : (
              <div>
                <SearchableMultiSelect
                  label="Products"
                  placeholder="Search products…"
                  emptyMessage="No products found"
                  selectedIds={selectedProductIds}
                  onSelectedIdsChange={setSelectedProductIds}
                  fetchItems={fetchProductsForPicker}
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Category membership matches your selection here. Save with Update.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <button
              type="submit"
              disabled={submitting || uploadingBanner || (canAssignProducts && membersLoading)}
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
