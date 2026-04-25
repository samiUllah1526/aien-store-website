/**
 * Money helpers for 2-decimal ISO currencies (PKR paisa, USD cents, etc.).
 * API/DB use integer minor units; admin forms use major units (e.g. PKR rupees) where noted.
 * For zero-decimal currencies (e.g. JPY) this module would need a per-currency scale.
 */
export const MINOR_UNITS_PER_MAJOR = 100 as const;

export function majorToMinorUnits(major: number): number {
  return Math.round(major * MINOR_UNITS_PER_MAJOR);
}

/**
 * Parse a user-entered major-units string to minor units. Empty or invalid input yields NaN.
 */
export function parseMajorStringToMinorUnits(s: string): number {
  const trimmed = s.trim();
  if (trimmed === '') return Number.NaN;
  const n = Number.parseFloat(trimmed);
  if (Number.isNaN(n) || n < 0) return Number.NaN;
  return majorToMinorUnits(n);
}

/** Form default from API: preserves fractional major units. */
export function minorUnitsToMajorString(minor: number): string {
  if (!Number.isFinite(minor) || minor < 0) return '';
  return (minor / MINOR_UNITS_PER_MAJOR).toString();
}

/**
 * Whole major units (floor) — matches voucher / display where decimals are not shown in input.
 */
export function minorUnitsToMajorStringFloor(minor: number): string {
  if (!Number.isFinite(minor) || minor < 0) return '';
  return String(Math.floor(minor / MINOR_UNITS_PER_MAJOR));
}
