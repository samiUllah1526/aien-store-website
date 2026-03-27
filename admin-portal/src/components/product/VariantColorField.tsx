import type { UseFormRegister, UseFormSetValue, UseFormTrigger, UseFormWatch } from 'react-hook-form';
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
  trigger: UseFormTrigger<ProductFormValues>;
  errorMessage?: string | null;
}

export function VariantColorField({ name, index, register, setValue, watch, trigger, errorMessage }: VariantColorFieldProps) {
  const currentColor = watch(name) ?? '';
  const pickerColor = normalizeHexColor(currentColor) ?? DEFAULT_PICKER_COLOR;

  const handleTextBlur = () => {
    const normalized = normalizeHexColor(currentColor);
    if (normalized != null && normalized !== currentColor) {
      setValue(name, normalized, { shouldDirty: true, shouldValidate: true });
    }
    void trigger(name);
  };

  return (
    <div className="flex flex-col gap-1">
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
          placeholder="#FFFFFF or ff0000"
          {...register(name)}
          onBlur={handleTextBlur}
          className={inputVariant}
          aria-invalid={!!errorMessage}
        />
      </div>
      {errorMessage && (
        <p className="text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
      )}
    </div>
  );
}
