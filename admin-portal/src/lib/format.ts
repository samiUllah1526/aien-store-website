/**
 * Format ISO date strings for display across the admin portal.
 * Always: DD/MM/YYYY, time with AM/PM (e.g. 05/02/2026, 3:45 PM).
 */

export function formatDateTime(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '—';
  try {
    const d = new Date(iso);
    const datePart = d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${datePart}, ${timePart.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase())}`;
  } catch {
    return iso;
  }
}
