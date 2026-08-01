import { useState, useCallback, useEffect, useRef } from 'react';
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
import { ImageCropModal, ASPECT_PRODUCT } from './ImageCropModal';
import type { UseFormReturn } from 'react-hook-form';
import { majorToMinorUnits, minorUnitsToMajorString } from '../lib/money';
import { RichTextEditor } from './RichTextEditor';

/** TipTap empty doc is often `<p></p>`; treat as no description. */
function normalizeRichText(html: string | undefined): string | undefined {
  if (!html?.trim()) return undefined;
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return text ? html : undefined;
}

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
    pricePkr: product != null ? minorUnitsToMajorString(product.price) : '',
    categoryIds: product?.categories?.map((c) => c.id) ?? [],
    primaryCategoryId: product?.primaryCategoryId ?? product?.categories?.[0]?.id ?? null,
    sizeGuideMediaId: product?.sizeGuideMediaId ?? null,
    featured: product?.featured ?? false,
    variants: product?.variants?.length
      ? product.variants.map((v) => ({
          id: v.id,
          color: v.color,
          size: v.size,
          sku: v.sku ?? '',
          stockQuantity: v.stockQuantity,
          priceOverridePkr:
            v.priceOverrideCents != null ? minorUnitsToMajorString(v.priceOverrideCents) : '',
          isActive: v.isActive,
          mediaIds: v.mediaIds ?? [],
        }))
      : [defaultVariant],
    mediaIds: product?.mediaIds ?? [],
  };
}

function mapFormValuesToSubmit(values: ProductFormValues, mediaIds: string[]): ProductFormData {
  const priceCents = majorToMinorUnits(Number.parseFloat(values.pricePkr));
  return {
    name: values.name,
    slug: values.slug || slugFromName(values.name),
    description: normalizeRichText(values.description),
    categoryIds: values.categoryIds?.length ? values.categoryIds : undefined,
    primaryCategoryId: values.categoryIds?.length
      ? values.primaryCategoryId && values.categoryIds.includes(values.primaryCategoryId)
        ? values.primaryCategoryId
        : values.categoryIds[0]
      : null,
    sizeGuideMediaId: values.sizeGuideMediaId ?? null,
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
        ? { priceOverrideCents: Math.max(0, majorToMinorUnits(Number.parseFloat(variant.priceOverridePkr))) }
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

  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [cropApplying, setCropApplying] = useState(false);
  const cropQueueRef = useRef<File[]>([]);
  const cropVariantIndexRef = useRef<number | null>(null);
  const cropObjectUrlRef = useRef<string | null>(null);

  const error = form.formState.errors.root?.serverError?.message;
  const mediaIds = form.watch('mediaIds') ?? [];
  const categoryIds = form.watch('categoryIds') ?? [];
  const primaryCategoryId = form.watch('primaryCategoryId');
  const sizeGuideMediaId = form.watch('sizeGuideMediaId');
  const [categoryOptions, setCategoryOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [sizeGuidePreview, setSizeGuidePreview] = useState<string | null>(
    product?.sizeGuideMediaId && product?.sizeGuideUrl ? product.sizeGuideUrl : null,
  );
  const [sizeGuideUploading, setSizeGuideUploading] = useState(false);
  const sizeGuideInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<Array<{ id: string; name: string }>>('/categories');
        if (!cancelled) setCategoryOptions(res.data ?? []);
      } catch {
        if (!cancelled) setCategoryOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!categoryIds.length) {
      if (primaryCategoryId) form.setValue('primaryCategoryId', null);
      return;
    }
    if (!primaryCategoryId || !categoryIds.includes(primaryCategoryId)) {
      form.setValue('primaryCategoryId', categoryIds[0]);
    }
  }, [categoryIds, primaryCategoryId, form]);

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

  const revokeCropObjectUrl = useCallback(() => {
    if (cropObjectUrlRef.current) {
      URL.revokeObjectURL(cropObjectUrlRef.current);
      cropObjectUrlRef.current = null;
    }
  }, []);

  const startCropQueue = useCallback((files: File[], variantIndex: number | null) => {
    const list = files.filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    revokeCropObjectUrl();
    cropVariantIndexRef.current = variantIndex;
    cropQueueRef.current = list;
    const first = list[0];
    const url = URL.createObjectURL(first);
    cropObjectUrlRef.current = url;
    setCropSourceFile(first);
    setCropImageSrc(url);
    setCropOpen(true);
  }, [revokeCropObjectUrl]);

  const advanceCropQueue = useCallback(() => {
    revokeCropObjectUrl();
    cropQueueRef.current = cropQueueRef.current.slice(1);
    if (cropQueueRef.current.length) {
      const next = cropQueueRef.current[0];
      const url = URL.createObjectURL(next);
      cropObjectUrlRef.current = url;
      setCropSourceFile(next);
      setCropImageSrc(url);
    } else {
      setCropOpen(false);
      setCropImageSrc(null);
      setCropSourceFile(null);
    }
  }, [revokeCropObjectUrl]);

  const handleCropCancel = useCallback(() => {
    revokeCropObjectUrl();
    cropQueueRef.current = [];
    setCropOpen(false);
    setCropImageSrc(null);
    setCropSourceFile(null);
  }, [revokeCropObjectUrl]);

  const handleCropApply = useCallback(
    async (croppedFile: File) => {
      setCropApplying(true);
      setUploading(true);
      try {
        const r = await doUpload(croppedFile);
        const vIdx = cropVariantIndexRef.current;
        if (vIdx === null) {
          const ids = form.getValues('mediaIds') ?? [];
          form.setValue('mediaIds', [...ids, r.id], { shouldValidate: true });
        } else {
          const fieldName = `variants.${vIdx}.mediaIds` as const;
          const current = form.getValues(fieldName) ?? [];
          form.setValue(fieldName, [...current, r.id], { shouldValidate: true, shouldDirty: true });
        }
        setMediaPreviews((prev) => {
          const next = { ...prev };
          if (r.preview) next[r.id] = r.preview;
          return next;
        });
        advanceCropQueue();
      } catch (err) {
        mapApiErrorToForm(err, form.setError);
        setUploading(false);
        setUploadProgress({});
        handleCropCancel();
      } finally {
        setCropApplying(false);
        if (cropQueueRef.current.length === 0) {
          setUploading(false);
          setUploadProgress({});
        }
      }
    },
    [advanceCropQueue, doUpload, form, handleCropCancel],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList?.length) return;
      // Materialize into a real array BEFORE resetting the input — `FileList`
      // is live and gets cleared by `e.target.value = ''`, which would otherwise
      // leave us with an empty array and silently abort the crop queue.
      const files = Array.from(fileList);
      form.clearErrors('root.serverError');
      e.target.value = '';
      startCropQueue(files, null);
    },
    [form, startCropQueue],
  );

  const handleVariantFileSelect = useCallback(
    (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList?.length) return;
      const files = Array.from(fileList);
      form.clearErrors('root.serverError');
      e.target.value = '';
      startCropQueue(files, index);
    },
    [form, startCropQueue],
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
        <span className={labelBase}>Description</span>
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
          Shown in the Description accordion on the product page. Use bold, links, and lists
          sparingly.
        </p>
        <Controller
          control={form.control}
          name="description"
          render={({ field }) => (
            <RichTextEditor
              value={field.value ?? ''}
              onChange={field.onChange}
              placeholder="Describe the piece…"
            />
          )}
        />
        {form.formState.errors.description && (
          <p className="mt-1 text-xs text-red-600">{form.formState.errors.description.message}</p>
        )}
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
      </div>

      {categoryIds.length > 0 && (
        <div>
          <label htmlFor="primaryCategoryId" className={labelBase}>
            Primary category (size guide fallback)
          </label>
          <select
            id="primaryCategoryId"
            {...form.register('primaryCategoryId')}
            className={inputBase}
          >
            {categoryIds.map((id) => {
              const name =
                categoryOptions.find((c) => c.id === id)?.name ??
                product?.categories?.find((c) => c.id === id)?.name ??
                id;
              return (
                <option key={id} value={id}>
                  {name}
                </option>
              );
            })}
          </select>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Used for size guide when this product has no product-level guide.
          </p>
        </div>
      )}

      <div>
        <span className={labelBase}>Size guide (optional)</span>
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
          Product guide overrides the primary category guide on the storefront.
        </p>
        <input
          ref={sizeGuideInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={sizeGuideUploading}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            setSizeGuideUploading(true);
            try {
              const uploaded = await uploadMedia(file, 'products');
              form.setValue('sizeGuideMediaId', uploaded.id, { shouldDirty: true, shouldValidate: true });
              setSizeGuidePreview(uploaded.deliveryUrl);
            } catch (err) {
              form.setError('root.serverError', {
                message: err instanceof Error ? err.message : 'Size guide upload failed',
              });
            } finally {
              setSizeGuideUploading(false);
            }
          }}
        />
        {sizeGuidePreview || sizeGuideMediaId ? (
          <div className="space-y-2">
            {sizeGuidePreview && (
              <img
                src={sizeGuidePreview}
                alt="Size guide preview"
                className="max-h-48 w-full rounded-lg border border-slate-200 object-contain dark:border-slate-600"
              />
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={sizeGuideUploading}
                onClick={() => sizeGuideInputRef.current?.click()}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {sizeGuideUploading ? 'Uploading…' : 'Replace size guide'}
              </button>
              <button
                type="button"
                onClick={() => {
                  form.setValue('sizeGuideMediaId', null, { shouldDirty: true });
                  setSizeGuidePreview(null);
                }}
                className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={sizeGuideUploading}
            onClick={() => sizeGuideInputRef.current?.click()}
            className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {sizeGuideUploading ? 'Uploading…' : 'Upload size guide image'}
          </button>
        )}
      </div>

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

      <ProductFormImages
        mediaIds={mediaIds}
        mediaPreviews={mediaPreviews}
        onAddFiles={handleFileSelect}
        onRemoveImage={removeImage}
        uploading={uploading}
        cropPending={cropOpen}
      />

      <VariantsSection
        fields={variantsFieldArray.fields}
        onAppend={appendVariant}
        onRemove={variantsFieldArray.remove}
        form={form}
        mediaPreviews={mediaPreviews}
        onAddVariantFiles={handleVariantFileSelect}
        onRemoveVariantImage={removeVariantImage}
        uploading={uploading}
        cropPending={cropOpen}
      />

      <ImageCropModal
        open={cropOpen}
        imageSrc={cropImageSrc}
        sourceFile={cropSourceFile}
        aspect={ASPECT_PRODUCT}
        title="Crop product image"
        onCancel={handleCropCancel}
        onApply={handleCropApply}
        applying={cropApplying}
      />


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
  cropPending,
}: {
  fields: { id: string }[];
  onAppend: () => void;
  onRemove: (index: number) => void;
  form: UseFormReturn<ProductFormValues>;
  mediaPreviews: Record<string, string>;
  onAddVariantFiles: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveVariantImage: (variantIndex: number, imageIndex: number) => void;
  uploading: boolean;
  cropPending: boolean;
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
          cropPending={cropPending}
        />
      ))}
    </div>
  );
}
