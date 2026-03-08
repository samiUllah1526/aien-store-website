interface ProductFormImagesProps {
  title?: string;
  mediaIds: string[];
  mediaPreviews: Record<string, string>;
  onAddFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  uploading: boolean;
  uploadLabel?: string;
}

export function ProductFormImages({
  title = 'Images',
  mediaIds,
  mediaPreviews,
  onAddFiles,
  onRemoveImage,
  uploading,
  uploadLabel = 'Add images',
}: ProductFormImagesProps) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {title}
      </label>
      <div className="flex flex-wrap gap-2">
        {mediaIds.map((id, index) => (
          <div
            key={id}
            className="relative flex items-center gap-1 overflow-hidden rounded border border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800"
          >
            {mediaPreviews[id] ? (
              <img
                src={mediaPreviews[id]}
                alt=""
                className="h-14 w-14 shrink-0 object-cover"
              />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center bg-slate-200 text-xs text-slate-500 dark:bg-slate-700">
                {id.slice(0, 8)}…
              </span>
            )}
            <button
              type="button"
              onClick={() => onRemoveImage(index)}
              className="absolute right-0.5 top-0.5 rounded bg-black/50 p-0.5 text-xs leading-none text-white hover:bg-red-600"
              aria-label="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          disabled={uploading}
          onChange={onAddFiles}
          className="sr-only"
        />
        {uploading ? 'Uploading…' : uploadLabel}
      </label>
    </div>
  );
}
