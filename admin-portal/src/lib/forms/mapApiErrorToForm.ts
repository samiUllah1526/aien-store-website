import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

const knownFieldMap: Record<string, string> = {
  email: 'email',
  name: 'name',
  slug: 'slug',
  code: 'code',
  value: 'value',
  type: 'type',
  price: 'pricePkr',
  'delivery charges': 'deliveryChargesPkr',
};

export function mapApiErrorToForm<TFieldValues extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<TFieldValues>,
): string {
  const message = err instanceof Error ? err.message : 'Request failed';
  const lower = message.toLowerCase();
  const fieldKey = Object.keys(knownFieldMap).find((key) => lower.includes(key));
  if (fieldKey) {
    setError(knownFieldMap[fieldKey] as Path<TFieldValues>, {
      type: 'server',
      message,
    });
  } else {
    setError('root.serverError' as Path<TFieldValues>, {
      type: 'server',
      message,
    });
  }
  return message;
}
