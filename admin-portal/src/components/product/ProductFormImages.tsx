import { useMemo, useState } from 'react';
import { AdminImagePreviewModal } from '../AdminImagePreviewModal';
import { resolveAdminImageUrl } from '../../lib/resolveImageUrl';

interface ProductFormImagesProps {
  title?: string;
  mediaIds: string[];
  mediaPreviews: Record<string, string>;
  onAddFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  uploading: boolean;
  /** True while crop modal is open (disables picking more files). */
  cropPending?: boolean;
  uploadLabel?: string;
}

export function ProductFormImages({
  title = 'Images',
  mediaIds,
  mediaPreviews,
  onAddFiles,
  onRemoveImage,
  uploading,
  cropPending = false,
  uploadLabel = 'Add images',
}: ProductFormImagesProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStartIndex, setPreviewStartIndex] = useState(0);

  const galleryUrls = useMemo(
    () =>
      mediaIds
        .map((id) => mediaPreviews[id])
        .filter((u): u is string => Boolean(u))
        .map((u) => resolveAdminImageUrl(u)),
    [mediaIds, mediaPreviews],
  );

  function openPreviewAtThumb(thumbIndex: number) {
    const id = mediaIds[thumbIndex];
    const raw = id ? mediaPreviews[id] : '';
    if (!raw) return;
    const resolved = resolveAdminImageUrl(raw);
    const idx = galleryUrls.indexOf(resolved);
    setPreviewStartIndex(idx >= 0 ? idx : 0);
    setPreviewOpen(true);
  }

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
              <button
                type="button"
                className="block h-14 w-14 shrink-0 cursor-zoom-in overflow-hidden p-0"
                onClick={() => openPreviewAtThumb(index)}
                aria-label="View full image"
              >
                <img
                  src={resolveAdminImageUrl(mediaPreviews[id])}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
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
          disabled={uploading || cropPending}
          onChange={onAddFiles}
          className="sr-only"
        />
        {uploading ? 'Uploading…' : cropPending ? 'Cropping…' : uploadLabel}
      </label>
      <AdminImagePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        images={galleryUrls}
        initialIndex={previewStartIndex}
      />
    </div>
  );
}
