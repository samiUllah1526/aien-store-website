import type { FormEvent } from 'react';
import { useState, useCallback, useEffect } from 'react';
import type { Product, ProductFormData, Category } from '../lib/types';
import { api, uploadFile } from '../lib/api';

interface ProductFormProps {
  product?: Product | null;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
}

/** Currency is fixed to PKR; selector is hidden. */
const FIXED_CURRENCY = 'PKR';

export function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [priceCents, setPriceCents] = useState(
    product != null ? String(product.price) : ''
  );
  const [categoryIds, setCategoryIds] = useState<string[]>(
    () => product?.categories?.map((c) => c.id) ?? []
  );
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [mediaIds, setMediaIds] = useState<string[]>(() => {
    if (product?.images?.length) return []; // existing product has images by URL; we don't have IDs for existing
    return [];
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCategoriesLoading(true);
      try {
        const res = await api.get<Category[]>('/categories');
        if (!cancelled) setCategories(res.data ?? []);
      } catch {
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const slugFromName = (value: string) =>
    value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

  const handleNameChange = (value: string) => {
    setName(value);
    if (!product) setSlug(slugFromName(value));
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    try {
      const ids: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const { id } = await uploadFile(files[i]);
        ids.push(id);
      }
      setMediaIds((prev) => [...prev, ...ids]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }, []);

  const removeImage = (index: number) => {
    setMediaIds((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const cents = parseInt(priceCents, 10);
    if (Number.isNaN(cents) || cents < 0) {
      setError('Price must be a non-negative number (in cents).');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        slug: slug || slugFromName(name),
        description: description || undefined,
        categoryIds: categoryIds.length ? categoryIds : undefined,
        priceCents: cents,
        currency: FIXED_CURRENCY,
        featured,
        mediaIds: mediaIds.length ? mediaIds : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Title
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
      <div>
        <label htmlFor="slug" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Slug
        </label>
        <input
          id="slug"
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="priceCents" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Price (cents)
          </label>
          <input
            id="priceCents"
            type="number"
            min={0}
            step={1}
            required
            value={priceCents}
            onChange={(e) => setPriceCents(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>
      <div>
        <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Categories (optional)
        </span>
        <div className="flex flex-wrap gap-3 rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
          {categoriesLoading ? (
            <span className="text-slate-500 dark:text-slate-400 text-sm">Loading…</span>
          ) : (
            categories.map((c) => (
              <label
                key={c.id}
                className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
              >
                <input
                  type="checkbox"
                  checked={categoryIds.includes(c.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setCategoryIds((prev) => [...prev, c.id]);
                    } else {
                      setCategoryIds((prev) => prev.filter((id) => id !== c.id));
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:checked:bg-slate-500"
                />
                {c.name} ({c.slug})
              </label>
            ))
          )}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Images
        </label>
        <div className="flex flex-wrap gap-2">
          {mediaIds.map((id, index) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded bg-slate-200 px-2 py-1 text-xs text-slate-700 dark:bg-slate-600 dark:text-slate-200"
            >
              {id.slice(0, 8)}…
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                aria-label="Remove"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            disabled={uploading}
            onChange={handleFileSelect}
            className="sr-only"
          />
          {uploading ? 'Uploading…' : 'Add images'}
        </label>
      </div>
      <div className="flex items-center gap-2">
        <input
          id="featured"
          type="checkbox"
          checked={featured}
          onChange={(e) => setFeatured(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:checked:bg-slate-500"
        />
        <label htmlFor="featured" className="text-sm font-medium text-slate-700">
          Featured
        </label>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-500"
        >
          {submitting ? 'Saving…' : product ? 'Update product' : 'Create product'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
