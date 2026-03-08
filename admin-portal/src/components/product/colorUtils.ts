/**
 * Helpers for variant color field (picker + hex code).
 */

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const HEX_6_PATTERN = /^[0-9a-fA-F]{6}$/;
const HEX_3_PATTERN = /^[0-9a-fA-F]{3}$/;

/** Returns a #RRGGBB hex string if the value is valid hex (with or without #), else null. */
export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (HEX_COLOR_PATTERN.test(trimmed)) {
    if (trimmed.length === 4) {
      const r = trimmed[1];
      const g = trimmed[2];
      const b = trimmed[3];
      return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
    }
    return trimmed.toUpperCase();
  }
  if (HEX_6_PATTERN.test(trimmed)) return `#${trimmed.toUpperCase()}`;
  if (HEX_3_PATTERN.test(trimmed)) {
    const r = trimmed[0];
    const g = trimmed[1];
    const b = trimmed[2];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return null;
}

export const DEFAULT_PICKER_COLOR = '#000000';

/** True if the value looks like a hex color code (starts with # or only hex digits). */
export function looksLikeHexInput(value: string): boolean {
  const t = value.trim();
  return t.length > 0 && (t.startsWith('#') || /^[0-9a-fA-F]+$/.test(t));
}

/** Returns an error message if the value looks like hex but is invalid, else null. */
export function getColorCodeError(value: string): string | null {
  const t = value.trim();
  if (t.length === 0) return null;
  if (!looksLikeHexInput(t)) return null;
  return normalizeHexColor(t) ? null : 'Invalid color code (use #RRGGBB or #RGB or 6/3 hex digits)';
}
