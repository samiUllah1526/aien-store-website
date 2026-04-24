import { useState, useCallback, useEffect } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { getCroppedImageFile } from '../lib/cropImage';

export const ASPECT_PRODUCT = 1;
/** Matches storefront category/about full-bleed banners (Tailwind aspect-video ≈ 16:9). */
export const ASPECT_BANNER = 16 / 9;
/** Wide header / navbar logo (horizontal wordmark). */
export const ASPECT_LOGO = 1;
/** Browser favicon / tab icon (raster); matches storefront `rel="icon"` — always square. */
export const ASPECT_FAVICON = 1;

interface ImageCropModalProps {
  open: boolean;
  /** Object URL from `URL.createObjectURL(file)` — parent revokes on close/complete. */
  imageSrc: string | null;
  sourceFile: File | null;
  aspect: number;
  title?: string;
  /** When true, crop stage is a square (same shape as favicon in settings / browser tab), not a wide strip. */
  squareViewport?: boolean;
  onCancel: () => void;
  onApply: (croppedFile: File) => void | Promise<void>;
  applying?: boolean;
}

/**
 * Modal: pan/zoom crop (react-easy-crop), then export cropped image as File for upload.
 */
export function ImageCropModal({
  open,
  imageSrc,
  sourceFile,
  aspect,
  title = 'Crop image',
  squareViewport = false,
  onCancel,
  onApply,
  applying = false,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleApply = async () => {
    if (!imageSrc || !sourceFile || !croppedAreaPixels) return;
    const file = await getCroppedImageFile(imageSrc, croppedAreaPixels, sourceFile);
    await onApply(file);
  };

  if (!open || !imageSrc) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-crop-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 dark:bg-black/70"
        aria-label="Close"
        onClick={onCancel}
      />
      <div className="relative z-[111] flex w-full max-w-lg flex-col rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-600">
          <h2 id="image-crop-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Drag to reposition, use the slider to zoom. The frame matches how images appear on the site.
          </p>
        </div>
        <div
          className={
            squareViewport
              ? 'relative mx-auto aspect-square w-full max-w-sm bg-slate-900 sm:max-w-md'
              : 'relative h-72 w-full bg-slate-900 sm:h-80'
          }
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid={false}
          />
        </div>
        <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-600">
          <label htmlFor="crop-zoom" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Zoom
          </label>
          <input
            id="crop-zoom"
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-slate-700 dark:accent-slate-400"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-600">
          <button
            type="button"
            onClick={onCancel}
            disabled={applying}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleApply()}
            disabled={applying || !croppedAreaPixels}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-500"
          >
            {applying ? 'Applying…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}
