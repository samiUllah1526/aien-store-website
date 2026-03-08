import type { UseFormReturn } from 'react-hook-form';
import type { ProductFormValues } from '../../lib/validation/product';
import { VariantColorField } from './VariantColorField';
import { inputVariant, labelVariant, checkboxBase } from './productFormStyles';
import { ProductFormImages } from './ProductFormImages';

interface VariantCardProps {
  index: number;
  form: UseFormReturn<ProductFormValues>;
  onRemove: () => void;
  canRemove: boolean;
  mediaPreviews: Record<string, string>;
  onAddFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  uploading: boolean;
}

const defaultVariant: ProductFormValues['variants'][number] = {
  color: '',
  size: '',
  sku: '',
  stockQuantity: 0,
  priceOverridePkr: '',
  isActive: true,
  mediaIds: [],
};

export function VariantCard({
  index,
  form,
  onRemove,
  canRemove,
  mediaPreviews,
  onAddFiles,
  onRemoveImage,
  uploading,
}: VariantCardProps) {
  const { register, setValue, watch } = form;
  const variantMediaIds = watch(`variants.${index}.mediaIds`) ?? [];
  const colorError = form.formState.errors.variants?.[index]?.color?.message ?? null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-6 dark:border-slate-700 dark:bg-slate-800/40">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Variant {index + 1}
        </p>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
          disabled={!canRemove}
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
        {/* Row 1: Color, Size */}
        <div className="min-w-0">
          <label htmlFor={`variant-color-${index}`} className={labelVariant}>
            Color
          </label>
          <VariantColorField
            name={`variants.${index}.color`}
            index={index}
            register={register}
            setValue={setValue}
            watch={watch}
            trigger={form.trigger}
            errorMessage={colorError}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor={`variant-size-${index}`} className={labelVariant}>
            Size
          </label>
          <input
            id={`variant-size-${index}`}
            type="text"
            placeholder="Size"
            {...register(`variants.${index}.size`)}
            className={inputVariant}
          />
        </div>

        {/* Row 2: SKU, Stock */}
        <div className="min-w-0">
          <label htmlFor={`variant-sku-${index}`} className={labelVariant}>
            SKU (optional)
          </label>
          <input
            id={`variant-sku-${index}`}
            type="text"
            placeholder="SKU (optional)"
            {...register(`variants.${index}.sku`)}
            className={inputVariant}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor={`variant-stock-${index}`} className={labelVariant}>
            Stock
          </label>
          <input
            id={`variant-stock-${index}`}
            type="number"
            min={0}
            placeholder="Stock"
            {...register(`variants.${index}.stockQuantity`, { valueAsNumber: true })}
            className={inputVariant}
          />
        </div>

        {/* Row 3: Override PKR only (full width on sm) */}
        <div className="min-w-0 sm:col-span-2">
          <label htmlFor={`variant-price-${index}`} className={labelVariant}>
            Override PKR
          </label>
          <input
            id={`variant-price-${index}`}
            type="number"
            min={0}
            step={0.01}
            placeholder="Override PKR"
            {...register(`variants.${index}.priceOverridePkr`)}
            className={inputVariant}
          />
        </div>

        {/* Active checkbox row */}
        <div className="flex items-center justify-start border-t border-slate-200 pt-4 dark:border-slate-700 sm:col-span-2 sm:justify-end">
          <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              {...register(`variants.${index}.isActive`)}
              className={checkboxBase}
            />
            Active
          </label>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
        <ProductFormImages
          title="Variant images"
          mediaIds={variantMediaIds}
          mediaPreviews={mediaPreviews}
          onAddFiles={onAddFiles}
          onRemoveImage={onRemoveImage}
          uploading={uploading}
          uploadLabel="Add variant images"
        />
      </div>
    </div>
  );
}

// Export for use in ProductForm when appending new variant
export { defaultVariant };
