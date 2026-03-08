import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { SearchableMultiSelect } from './SearchableMultiSelect';

type FetchParams = { search: string; page: number };
type FetchResult = Promise<{ items: Array<{ id: string; label: string }>; hasMore: boolean }>;

interface RHFSearchableMultiSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder: string;
  emptyMessage: string;
  fetchItems: (params: FetchParams) => FetchResult;
}

export function RHFSearchableMultiSelect<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  emptyMessage,
  fetchItems,
}: RHFSearchableMultiSelectProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <SearchableMultiSelect
          label={label}
          placeholder={placeholder}
          emptyMessage={emptyMessage}
          selectedIds={Array.isArray(field.value) ? field.value : []}
          onSelectedIdsChange={field.onChange}
          fetchItems={fetchItems}
        />
      )}
    />
  );
}
