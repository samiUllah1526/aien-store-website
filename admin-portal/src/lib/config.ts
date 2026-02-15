/**
 * Shared config (API URL etc). Use this in Astro to avoid import.meta.env in frontmatter.
 */
const url =
  typeof import.meta !== 'undefined' && (import.meta as { env?: { PUBLIC_API_URL?: string } }).env?.PUBLIC_API_URL;
export const API_BASE_URL = (url && String(url).trim()) || 'http://localhost:3000';
