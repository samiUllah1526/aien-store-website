import * as fs from 'fs';
import * as path from 'path';
import mjml2html from 'mjml';

/** Resolve path to a template file. Tries __dirname (dist) first, then src/ for dev/watch when assets aren't copied. */
function resolveTemplatePath(templateName: string): { filePath: string; templatesDir: string } {
  const inDist = path.join(__dirname, `${templateName}.mjml`);
  if (fs.existsSync(inDist)) return { filePath: inDist, templatesDir: __dirname };
  const srcTemplatesDir = path.join(process.cwd(), 'src', 'modules', 'mail', 'templates');
  const inSrc = path.join(srcTemplatesDir, `${templateName}.mjml`);
  if (fs.existsSync(inSrc)) return { filePath: inSrc, templatesDir: srcTemplatesDir };
  return { filePath: inDist, templatesDir: __dirname };
}

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Replace {{key}} placeholders in template. Values are HTML-escaped by default.
 * Keys ending with _html are inserted raw (caller must ensure they are safe).
 */
export function replacePlaceholders(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    const safe =
      key.endsWith('_html') ? String(value ?? '') : escapeHtml(String(value ?? ''));
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), safe);
  }
  return out;
}

/**
 * Load MJML template, replace placeholders, compile to HTML.
 * Returns { html, text } where text is a plain-text fallback (strip tags).
 */
export function renderMjmlTemplate(
  templateName: string,
  vars: Record<string, string>,
): { html: string; text: string } {
  const { filePath, templatesDir } = resolveTemplatePath(templateName);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const mjmlSource = replacePlaceholders(raw, vars);
  const result = mjml2html(mjmlSource, {
    validationLevel: 'soft',
    minify: true,
    filePath: templatesDir,
  });
  if (result.errors?.length) {
    console.warn(`[Mail] MJML template ${templateName} warnings:`, result.errors);
  }
  const html = result.html;
  const text = stripHtmlToText(html);
  return { html, text };
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
