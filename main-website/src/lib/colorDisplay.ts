/**
 * Variant color values are sometimes stored as hex. Never surface raw hex in UI copy.
 */

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function isHexColorString(value: string): boolean {
  return HEX.test(value.trim());
}

/**
 * Human-readable color label. Empty string when the value is a hex code (use swatch / generic copy instead).
 */
export function formatColorLabel(value: string): string {
  const t = value.trim();
  if (!t) return '';
  if (isHexColorString(t)) return '';
  return t
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Short label for inline UI when hex must not appear — e.g. filter chips, ARIA. */
export function colorUiLabel(value: string): string {
  const f = formatColorLabel(value);
  if (f) return f;
  if (isHexColorString(value)) return 'Color';
  return value;
}

export function colorAriaLabel(value: string): string {
  const f = formatColorLabel(value);
  if (f) return `Color: ${f}`;
  if (isHexColorString(value)) return 'Color';
  return `Color: ${value}`;
}
