import { useState, useCallback, useEffect } from 'react';
import { Controller, useFieldArray } from 'react-hook-form';
import type { Product, ProductFormData } from '../lib/types';
import { api, uploadFile } from '../lib/api';
import { uploadMedia } from '../lib/media-upload';
import { SearchableMultiSelect } from './SearchableMultiSelect';
import { productFormSchema, type ProductFormValues } from '../lib/validation/product';
import { useZodForm } from '../lib/forms/useZodForm';
import { mapApiErrorToForm } from '../lib/forms/mapApiErrorToForm';
import {
  VariantCard,
  defaultVariant,
  ProductFormImages,
  inputBase,
  labelBase,
} from './product';
import type { UseFormReturn } from 'react-hook-form';

interface ProductFormProps {
  product?: Product | null;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
}

const FIXED_CURRENCY = 'PKR';

function slugFromName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function buildFormDefaultValues(product: Product | null | undefined): Partial<ProductFormValues> {
  return {
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    description: product?.description ?? '',
    pricePkr: product != null ? (product.price / 100).toString() : '',
    categoryIds: product?.categories?.map((c) => c.id) ?? [],
    featured: product?.featured ?? false,
    variants: product?.variants?.length
      ? product.variants.map((v) => ({
          id: v.id,
          color: v.color,
          size: v.size,
          sku: v.sku ?? '',
          stockQuantity: v.stockQuantity,
          priceOverridePkr:
            v.priceOverrideCents != null ? (v.priceOverrideCents / 100).toString() : '',
          isActive: v.isActive,
          mediaIds: v.mediaIds ?? [],
        }))
      : [defaultVariant],
    mediaIds: product?.mediaIds ?? [],
  };
}

function mapFormValuesToSubmit(values: ProductFormValues, mediaIds: string[]): ProductFormData {
  const priceCents = Math.round(Number.parseFloat(values.pricePkr) * 100);
  return {
    name: values.name,
    slug: values.slug || slugFromName(values.name),
    description: values.description || undefined,
    categoryIds: values.categoryIds?.length ? values.categoryIds : undefined,
    priceCents,
    currency: FIXED_CURRENCY,
    featured: values.featured,
    variants: values.variants.map((variant) => ({
      ...(variant.id ? { id: variant.id } : {}),
      color: variant.color.trim(),
      size: variant.size.trim(),
      ...(variant.sku?.trim() ? { sku: variant.sku.trim() } : {}),
      stockQuantity: variant.stockQuantity,
      ...(variant.priceOverridePkr?.trim()
        ? { priceOverrideCents: Math.max(0, Math.round(Number.parseFloat(variant.priceOverridePkr) * 100)) }
        : {}),
      isActive: variant.isActive,
      mediaIds: variant.mediaIds ?? [],
    })),
    mediaIds: mediaIds.length ? mediaIds : undefined,
  };
}

export function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const form = useZodForm({
    schema: productFormSchema,
    defaultValues: buildFormDefaultValues(product),
  });

  const variantsFieldArray = useFieldArray({
    control: form.control,
    name: 'variants',
  });

  const [mediaPreviews, setMediaPreviews] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const error = form.formState.errors.root?.serverError?.message;
  const mediaIds = form.watch('mediaIds') ?? [];

  useEffect(() => {
    if (!product) return;
    setMediaPreviews((prev) => {
      const next = { ...prev };
      (product.mediaIds ?? []).forEach((id, index) => {
        const image = product.images?.[index];
        if (image) next[id] = image;
      });
      (product.variants ?? []).forEach((variant) => {
        (variant.mediaIds ?? []).forEach((id, index) => {
          const image = variant.images?.[index];
          if (image) next[id] = image;
        });
      });
      return next;
    });
  }, [product]);

  const fetchCategories = useCallback(async ({ search }: { search: string; page: number }) => {
    const res = await api.get<Array<{ id: string; name: string }>>('/categories', search ? { search } : undefined);
    const items = (res.data ?? []).map((c) => ({ id: c.id, label: c.name }));
    return { items, hasMore: false };
  }, []);

  const doUpload = useCallback(async (file: File): Promise<{ id: string; preview?: string }> => {
    try {
      const result = await uploadMedia(file, 'products', {
        onProgress: (p) => setUploadProgress((prev) => ({ ...prev, [file.name]: p })),
      });
      return { id: result.id, preview: result.deliveryUrl };
    } catch {
      const { id } = await uploadFile(file);
      return { id };
    }
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      form.clearErrors('root.serverError');
      setUploading(true);
      try {
        const results: { id: string; preview?: string }[] = [];
        for (let i = 0; i < files.length; i++) {
          const r = await doUpload(files[i]);
          results.push(r);
        }
        form.setValue('mediaIds', [...(form.getValues('mediaIds') ?? []), ...results.map((r) => r.id)], {
          shouldValidate: true,
        });
        setMediaPreviews((prev) => {
          const next = { ...prev };
          results.forEach((r) => {
            if (r.preview) next[r.id] = r.preview;
          });
          return next;
        });
      } catch (err) {
        mapApiErrorToForm(err, form.setError);
      } finally {
        setUploading(false);
        setUploadProgress({});
        e.target.value = '';
      }
    },
    [doUpload, form]
  );

  const handleVariantFileSelect = useCallback(
    async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      form.clearErrors('root.serverError');
      setUploading(true);
      try {
        const results: { id: string; preview?: string }[] = [];
        for (let i = 0; i < files.length; i++) {
          const r = await doUpload(files[i]);
          results.push(r);
        }
        const fieldName = `variants.${index}.mediaIds` as const;
        const current = form.getValues(fieldName) ?? [];
        form.setValue(fieldName, [...current, ...results.map((r) => r.id)], {
          shouldValidate: true,
          shouldDirty: true,
        });
        setMediaPreviews((prev) => {
          const next = { ...prev };
          results.forEach((r) => {
            if (r.preview) next[r.id] = r.preview;
          });
          return next;
        });
      } catch (err) {
        mapApiErrorToForm(err, form.setError);
      } finally {
        setUploading(false);
        setUploadProgress({});
        e.target.value = '';
      }
    },
    [doUpload, form],
  );

  const removeImage = useCallback(
    (index: number) => {
      const id = mediaIds[index];
      form.setValue(
        'mediaIds',
        mediaIds.filter((_, i) => i !== index),
        { shouldValidate: true }
      );
      if (id) {
        setMediaPreviews((prev) => {
          const n = { ...prev };
          delete n[id];
          return n;
        });
      }
    },
    [form, mediaIds]
  );

  const removeVariantImage = useCallback(
    (variantIndex: number, imageIndex: number) => {
      const fieldName = `variants.${variantIndex}.mediaIds` as const;
      const ids = form.getValues(fieldName) ?? [];
      const id = ids[imageIndex];
      form.setValue(
        fieldName,
        ids.filter((_, i) => i !== imageIndex),
        { shouldValidate: true, shouldDirty: true },
      );
      if (id) {
        setMediaPreviews((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [form],
  );

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors('root.serverError');
    setSubmitting(true);
    try {
      await onSubmit(mapFormValuesToSubmit(values, mediaIds));
    } catch (err) {
      mapApiErrorToForm(err, form.setError);
    } finally {
      setSubmitting(false);
    }
  });

  const appendVariant = () =>
    variantsFieldArray.append(defaultVariant);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className={labelBase}>
          Title
        </label>
        <input
          id="name"
          type="text"
          required
          {...form.register('name', {
            onChange: (e) => {
              if (!product && !form.formState.dirtyFields.slug) {
                form.setValue('slug', slugFromName(e.target.value), { shouldValidate: true });
              }
            },
          })}
          className={inputBase}
        />
      </div>

      <div>
        <label htmlFor="slug" className={labelBase}>
          Slug
        </label>
        <input id="slug" type="text" {...form.register('slug')} className={inputBase} />
      </div>

      <div>
        <label htmlFor="description" className={labelBase}>
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          {...form.register('description')}
          className={inputBase}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="pricePkr" className={labelBase}>
            Price (PKR)
          </label>
          <input
            id="pricePkr"
            type="number"
            min={0}
            step={0.01}
            required
            {...form.register('pricePkr')}
            placeholder="e.g. 50"
            className={inputBase}
          />
        </div>
      </div>

      <VariantsSection
        fields={variantsFieldArray.fields}
        onAppend={appendVariant}
        onRemove={variantsFieldArray.remove}
        form={form}
        mediaPreviews={mediaPreviews}
        onAddVariantFiles={handleVariantFileSelect}
        onRemoveVariantImage={removeVariantImage}
        uploading={uploading}
      />

      <Controller
        control={form.control}
        name="categoryIds"
        render={({ field }) => (
          <SearchableMultiSelect
            label="Categories (optional)"
            placeholder="Search categories…"
            emptyMessage="No categories"
            selectedIds={field.value ?? []}
            onSelectedIdsChange={field.onChange}
            fetchItems={fetchCategories}
          />
        )}
      />

      <ProductFormImages
        mediaIds={mediaIds}
        mediaPreviews={mediaPreviews}
        onAddFiles={handleFileSelect}
        onRemoveImage={removeImage}
        uploading={uploading}
      />

      <div className="flex items-center gap-2">
        <input
          id="featured"
          type="checkbox"
          {...form.register('featured')}
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

/** Variants section: header + list of VariantCard. */
function VariantsSection({
  fields,
  onAppend,
  onRemove,
  form,
  mediaPreviews,
  onAddVariantFiles,
  onRemoveVariantImage,
  uploading,
}: {
  fields: { id: string }[];
  onAppend: () => void;
  onRemove: (index: number) => void;
  form: UseFormReturn<ProductFormValues>;
  mediaPreviews: Record<string, string>;
  onAddVariantFiles: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveVariantImage: (variantIndex: number, imageIndex: number) => void;
  uploading: boolean;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Variants
        </label>
        <button
          type="button"
          onClick={onAppend}
          className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Add variant
        </button>
      </div>
      {fields.map((variant, index) => (
        <VariantCard
          key={variant.id}
          index={index}
          form={form}
          onRemove={() => onRemove(index)}
          canRemove={fields.length > 1}
          mediaPreviews={mediaPreviews}
          onAddFiles={(e) => onAddVariantFiles(index, e)}
          onRemoveImage={(imageIndex) => onRemoveVariantImage(index, imageIndex)}
          uploading={uploading}
        />
      ))}
    </div>
  );
}
