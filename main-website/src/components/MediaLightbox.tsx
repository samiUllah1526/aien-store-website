/**
 * Reusable media lightbox: dark transparent overlay, white circular close,
 * previous/next controls, image view and native video playback.
 */

import { useCallback, useEffect, useId } from 'react';

export type LightboxMediaItem = {
  id: string;
  url: string;
  mimeType?: string;
  kind: 'image' | 'video';
};

export interface MediaLightboxProps {
  items: LightboxMediaItem[];
  index: number;
  open: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export default function MediaLightbox({
  items,
  index,
  open,
  onClose,
  onIndexChange,
}: MediaLightboxProps) {
  const titleId = useId();
  const current = items[index] ?? null;
  const hasMultiple = items.length > 1;

  const goPrev = useCallback(() => {
    if (!items.length) return;
    onIndexChange((index - 1 + items.length) % items.length);
  }, [index, items.length, onIndexChange]);

  const goNext = useCallback(() => {
    if (!items.length) return;
    onIndexChange((index + 1) % items.length);
  }, [index, items.length, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, goPrev, goNext]);

  if (!open || !current) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <span id={titleId} className="sr-only">
        Media preview {index + 1} of {items.length}
      </span>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-lg transition hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="Close"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {hasMultiple && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-lg transition hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-6"
          aria-label="Previous"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {hasMultiple && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-lg transition hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6"
          aria-label="Next"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      <div
        className="relative flex max-h-[85vh] max-w-[min(96vw,1100px)] items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {current.kind === 'video' ? (
          <video
            key={current.id}
            src={current.url}
            controls
            playsInline
            autoPlay
            className="max-h-[85vh] max-w-full rounded-lg bg-black shadow-2xl"
          />
        ) : (
          <img
            key={current.id}
            src={current.url}
            alt=""
            className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
          />
        )}
      </div>

      {hasMultiple && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
          {index + 1} / {items.length}
        </p>
      )}
    </div>
  );
}
