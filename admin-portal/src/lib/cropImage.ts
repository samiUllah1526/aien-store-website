import type { Area } from 'react-easy-crop';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (e) => reject(e));
    img.src = src;
  });
}

function pickMime(originalType: string): 'image/jpeg' | 'image/png' | 'image/webp' {
  if (originalType.includes('png')) return 'image/png';
  if (originalType.includes('webp')) return 'image/webp';
  return 'image/jpeg';
}

function extensionForMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

const MAX_OUTPUT_EDGE = 2048;

/**
 * Crop image to pixel rect and return as File (for upload).
 */
export async function getCroppedImageFile(
  imageSrc: string,
  pixelCrop: Area,
  sourceFile: File,
): Promise<File> {
  const image = await loadImage(imageSrc);
  const mime = pickMime(sourceFile.type);
  let { width, height } = pixelCrop;

  const canvas = document.createElement('canvas');
  const scale = Math.min(1, MAX_OUTPUT_EDGE / Math.max(width, height));
  const outW = Math.round(width * scale);
  const outH = Math.round(height * scale);
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outW,
    outH,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Crop failed'));
      },
      mime,
      mime === 'image/jpeg' ? 0.92 : undefined,
    );
  });

  const base =
    sourceFile.name.replace(/\.[^.]+$/, '') || 'image';
  const ext = extensionForMime(mime);
  return new File([blob], `${base}-cropped.${ext}`, { type: mime });
}
