import type { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import type { ProductFormValues } from '../../lib/validation/product';
import { normalizeHexColor, DEFAULT_PICKER_COLOR } from './colorUtils';
import { inputVariant } from './productFormStyles';

type ColorFieldName = `variants.${number}.color`;

interface VariantColorFieldProps {
  name: ColorFieldName;
  index: number;
  register: UseFormRegister<ProductFormValues>;
  setValue: UseFormSetValue<ProductFormValues>;
  watch: UseFormWatch<ProductFormValues>;
}

export function VariantColorField({ name, index, register, setValue, watch }: VariantColorFieldProps) {
  const currentColor = watch(name) ?? '';
  const pickerColor = normalizeHexColor(currentColor) ?? DEFAULT_PICKER_COLOR;

  return (
    <div className="flex items-center gap-2">
      <input
        id={`variant-color-${index}`}
        type="color"
        value={pickerColor}
        onChange={(e) =>
          setValue(name, e.target.value.toUpperCase(), {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        className="h-10 w-12 cursor-pointer rounded border border-slate-300 bg-white p-1 dark:border-slate-600 dark:bg-slate-800"
        aria-label={`Pick color for variant ${index + 1}`}
      />
      <input
        type="text"
        placeholder="#FFFFFF"
        {...register(name)}
        className={inputVariant}
      />
    </div>
  );
}
