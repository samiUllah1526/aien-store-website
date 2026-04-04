import { useEffect, useState } from 'react';

const checkerboardClass =
  'rounded-lg bg-[length:12px_12px] [background-image:repeating-conic-gradient(#94a3b8_0%_25%,#cbd5e1_0%_50%)] dark:[background-image:repeating-conic-gradient(#475569_0%_25%,#64748b_0%_50%)]';

interface AdminImagePreviewModalProps {
  open: boolean;
  onClose: () => void;
  /** Display URLs (already absolute). */
  images: string[];
  initialIndex?: number;
}

/**
 * Full-screen image preview: dim translucent overlay, checkerboard behind image
 * (so transparent PNGs are visible), prev/next when multiple images.
 */
export function AdminImagePreviewModal({
  open,
  onClose,
  images,
  initialIndex = 0,
}: AdminImagePreviewModalProps) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) {
      const max = Math.max(0, images.length - 1);
      setIndex(Math.min(Math.max(0, initialIndex), max));
    }
  }, [open, initialIndex, images.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (images.length <= 1) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIndex((i) => (i > 0 ? i - 1 : images.length - 1));
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIndex((i) => (i < images.length - 1 ? i + 1 : 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, images.length, onClose]);

  if (!open || images.length === 0) return null;

  const safeIndex = Math.min(index, images.length - 1);
  const src = images[safeIndex];
  const hasMultiple = images.length > 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/35 dark:bg-black/40"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div className="relative z-[101] flex max-h-[90vh] max-w-[min(96vw,1200px)] flex-col items-center gap-3">
        <div className={`relative flex max-h-[85vh] min-h-0 min-w-0 items-center justify-center p-4 ${checkerboardClass}`}>
          <button
            type="button"
            className="absolute right-2 top-2 z-10 rounded-full bg-slate-800/90 p-2 text-white shadow-lg hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={src}
            alt=""
            className="max-h-[min(85vh,900px)] max-w-full object-contain"
            draggable={false}
          />
        </div>
        {hasMultiple && (
          <div className="flex items-center gap-4 text-sm text-slate-800 drop-shadow-sm dark:text-slate-100">
            <button
              type="button"
              className="rounded-lg bg-white/90 px-3 py-2 font-medium shadow dark:bg-slate-700/90 dark:hover:bg-slate-600"
              onClick={() => setIndex((i) => (i > 0 ? i - 1 : images.length - 1))}
            >
              Previous
            </button>
            <span className="tabular-nums">
              {safeIndex + 1} / {images.length}
            </span>
            <button
              type="button"
              className="rounded-lg bg-white/90 px-3 py-2 font-medium shadow dark:bg-slate-700/90 dark:hover:bg-slate-600"
              onClick={() => setIndex((i) => (i < images.length - 1 ? i + 1 : 0))}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
