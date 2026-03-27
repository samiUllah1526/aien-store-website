import { useForm, type DefaultValues, type UseFormProps, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

type UseZodFormOptions<TSchema extends z.ZodTypeAny> = Omit<
  UseFormProps<z.input<TSchema>>,
  'resolver'
> & {
  schema: TSchema;
  defaultValues?: DefaultValues<z.input<TSchema>>;
};

export function useZodForm<TSchema extends z.ZodTypeAny>({
  schema,
  defaultValues,
  ...options
}: UseZodFormOptions<TSchema>): UseFormReturn<z.input<TSchema>> {
  return useForm<z.input<TSchema>>({
    resolver: zodResolver(schema),
    defaultValues,
    ...options,
  });
}
