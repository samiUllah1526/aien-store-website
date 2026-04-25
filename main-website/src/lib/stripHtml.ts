import sanitizeHtml from 'sanitize-html';

/**
 * Strip ALL HTML tags from a string and collapse whitespace, returning plain
 * text suitable for card previews, eyebrows, line-clamped excerpts, and SEO
 * meta descriptions.
 *
 * Use this whenever rich-text content (e.g. a TipTap-authored category
 * description) needs to be rendered in a context that expects plain text.
 *
 * Implementation note: `sanitize-html`'s default config keeps a small allow-
 * list (`<a>`, `<b>`, `<br>`, ...). We pass `allowedTags: []` and
 * `allowedAttributes: {}` so every tag is removed; the library still decodes
 * HTML entities for us (`&nbsp;`, `&amp;`, ...).
 *
 * NOT a security boundary for HTML rendering — never feed the output back
 * into `set:html` / `dangerouslySetInnerHTML`. Use `sanitize-html` with a
 * proper allowlist for that.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();
}
