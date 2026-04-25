/**
 * Render every transactional email template against realistic fixtures, write
 * the HTML to a working directory, build a branded index page, and open the
 * default browser for visual review.
 *
 * Run:  npm run preview:emails
 *
 * Notes:
 * - Uses the project's own `renderMjmlTemplate` so previews are byte-identical
 *   to what the mail service sends in production (including <mj-include>
 *   partial resolution and {{placeholder}} substitution).
 * - The order-confirmation table HTML mirrors `MailService.buildOrderItemsTableHtml`
 *   so the editorial table styling is faithful. Keep them in sync if either changes.
 * - No DB / SMTP / network needed. Pure file rendering.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawn } from 'child_process';
import { renderMjmlTemplate } from '../src/modules/mail/templates/render';

const COMPANY = 'AIEN';

interface Fixture {
  /** Eyebrow shown on the index card. */
  eyebrow: string;
  /** Display title shown on the index card (mirrors the email subject in spirit). */
  title: string;
  /** Short description for the index card. */
  description: string;
  /** Variables passed to renderMjmlTemplate. */
  vars: Record<string, string>;
}

/* --------------------------------------------------------------------------
 * Sample items table (mirrors MailService.buildOrderItemsTableHtml output).
 * Kept inline so the preview script has zero coupling to NestJS DI.
 * -------------------------------------------------------------------------- */

interface PreviewItem {
  productName: string;
  quantity: number;
  unitMinor: number; // minor units, e.g. paisas
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMinorAsMajor(minor: number): string {
  const value = (minor / 100).toFixed(2);
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function buildItemsTableHtml(items: PreviewItem[]): string {
  const fontStack = "Inter, Arial, 'Helvetica Neue', sans-serif";
  const ruleColor = '#c4c7c7';
  const inkColor = '#1b1c1c';
  const mutedColor = '#444748';
  const headerStyle = `padding:14px 0 12px;border-bottom:1px solid ${ruleColor};color:${mutedColor};font-family:${fontStack};font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;`;
  const cellBase = `padding:18px 0;border-bottom:1px solid ${ruleColor};font-family:${fontStack};font-size:14px;line-height:1.5;color:${inkColor};vertical-align:top;`;
  const productCell = `${cellBase}text-align:left;`;
  const qtyCell = `${cellBase}text-align:center;color:${mutedColor};`;
  const unitCell = `${cellBase}text-align:right;color:${mutedColor};font-variant-numeric:tabular-nums;`;
  const totalCell = `${cellBase}text-align:right;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;`;

  const rows = items
    .map(
      (i) =>
        `<tr>` +
        `<td style="${productCell}">${escapeHtml(i.productName)}</td>` +
        `<td style="${qtyCell}">${i.quantity}</td>` +
        `<td style="${unitCell}">${formatMinorAsMajor(i.unitMinor)}</td>` +
        `<td style="${totalCell}">${formatMinorAsMajor(i.quantity * i.unitMinor)}</td>` +
        `</tr>`,
    )
    .join('');
  return (
    `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"` +
    ` style="border-collapse:collapse;margin:0;width:100%;font-family:${fontStack};">` +
    `<thead><tr>` +
    `<th style="${headerStyle}text-align:left">Item</th>` +
    `<th style="${headerStyle}text-align:center;width:56px">Qty</th>` +
    `<th style="${headerStyle}text-align:right;width:100px">Unit</th>` +
    `<th style="${headerStyle}text-align:right;width:120px">Total</th>` +
    `</tr></thead>` +
    `<tbody>${rows}</tbody></table>`
  );
}

/* -------------------------------------------------------------------------- */

const sampleItems: PreviewItem[] = [
  { productName: 'Beggy Tee — Cream', quantity: 2, unitMinor: 320000 },
  { productName: 'Linen Trouser — Sand', quantity: 1, unitMinor: 600000 },
  { productName: 'Embroidered Stole — Indigo', quantity: 1, unitMinor: 480000 },
];
const sampleSubtotalMinor = sampleItems.reduce(
  (acc, i) => acc + i.quantity * i.unitMinor,
  0,
);
const sampleTotalFormatted = `PKR ${formatMinorAsMajor(sampleSubtotalMinor)}`;

const fixtures: Record<string, Fixture> = {
  welcome: {
    eyebrow: 'Account · New',
    title: 'Welcome',
    description: 'Sent when a customer signs up via the storefront.',
    vars: { name: 'Saira', companyName: COMPANY },
  },
  'user-created': {
    eyebrow: 'Account · Access',
    title: 'Account ready',
    description: 'Sent when an admin provisions an account for a user.',
    vars: {
      name: 'Saira',
      loginUrl: 'https://admin.aien.example/admin/login',
      companyName: COMPANY,
    },
  },
  'password-reset': {
    eyebrow: 'Security · Password',
    title: 'Reset password',
    description: 'Sent when a user requests a password reset link.',
    vars: {
      name: 'Saira',
      resetLink:
        'https://aien.example/reset-password?token=preview-token-abc123',
      companyName: COMPANY,
    },
  },
  invite: {
    eyebrow: 'Admin · Invitation',
    title: 'Admin invitation',
    description: 'Sent when an admin invites a new admin / staff user.',
    vars: {
      name: 'Saira',
      setPasswordLink:
        'https://admin.aien.example/set-password?token=preview-invite-xyz',
      companyName: COMPANY,
    },
  },
  'order-confirmation': {
    eyebrow: 'Order · Confirmed',
    title: 'Order confirmation',
    description: 'Sent immediately after a customer places an order.',
    vars: {
      customerName: 'Saira',
      orderId: 'AIEN-1024',
      orderDate: '26 April 2026',
      totalFormatted: sampleTotalFormatted,
      companyName: COMPANY,
      itemsTable_html: buildItemsTableHtml(sampleItems),
    },
  },
  'order-status-change': {
    eyebrow: 'Order · Update',
    title: 'Order status update',
    description: 'Sent when an order moves to a new fulfilment state.',
    vars: {
      customerName: 'Saira',
      orderId: 'AIEN-1024',
      status: 'Shipped',
      statusUpdatedAt: '26 April 2026, 14:32',
      companyName: COMPANY,
    },
  },
};

/* -------------------------------------------------------------------------- */

const outDir = path.join(os.tmpdir(), 'aien-email-previews');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const cards: string[] = [];
for (const [name, fx] of Object.entries(fixtures)) {
  const { html } = renderMjmlTemplate(name, fx.vars);
  const fileName = `${name}.html`;
  fs.writeFileSync(path.join(outDir, fileName), html);
  cards.push(buildCardHtml(name, fileName, fx));
}

fs.writeFileSync(path.join(outDir, 'index.html'), buildIndexHtml(cards));

const indexPath = path.join(outDir, 'index.html');
const count = Object.keys(fixtures).length;
console.log(`\n  ${COMPANY} email previews\n  ─────────────────────`);
console.log(`  Rendered ${count} templates → ${outDir}`);
console.log(`  Opening ${indexPath}\n`);
openInBrowser(indexPath);

/* -------------------------------------------------------------------------- */

function buildCardHtml(name: string, fileName: string, fx: Fixture): string {
  return `
    <article class="card">
      <header class="card-head">
        <p class="eyebrow">${escapeHtml(fx.eyebrow)}</p>
        <h2 class="card-title">${escapeHtml(fx.title)}</h2>
        <p class="card-desc">${escapeHtml(fx.description)}</p>
        <p class="card-meta">
          <code>${escapeHtml(name)}.mjml</code>
          <span class="dot">·</span>
          <a class="open-link" href="${escapeHtml(fileName)}" target="_blank" rel="noreferrer">
            Open in new tab →
          </a>
        </p>
      </header>
      <div class="frame-wrap">
        <iframe
          title="${escapeHtml(fx.title)} preview"
          src="${escapeHtml(fileName)}"
          loading="lazy"></iframe>
      </div>
    </article>
  `;
}

function buildIndexHtml(cards: string[]): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(COMPANY)} · email previews</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Serif:wght@400;500&display=swap"
    rel="stylesheet" />
  <style>
    :root {
      --bg: #fbf9f9;
      --card: #ffffff;
      --ink: #1b1c1c;
      --muted: #444748;
      --fine: #747878;
      --rule: #c4c7c7;
      --accent: #2b685c;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--ink);
      -webkit-font-smoothing: antialiased;
      line-height: 1.6;
    }
    .page { max-width: 1280px; margin: 0 auto; padding: 64px 32px 96px; }
    .hero { text-align: center; padding-bottom: 48px; border-bottom: 1px solid var(--rule); margin-bottom: 48px; }
    .brand {
      font-family: 'Noto Serif', Georgia, serif;
      font-size: 26px;
      letter-spacing: 0.04em;
      margin: 0 0 18px;
      font-weight: 500;
    }
    .brand-rule { width: 28px; height: 1px; background: var(--ink); margin: 0 auto 28px; }
    .eyebrow {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.20em;
      text-transform: uppercase;
      color: var(--muted);
      margin: 0;
    }
    .hero-title {
      font-family: 'Noto Serif', Georgia, serif;
      font-size: clamp(36px, 5vw, 48px);
      font-weight: 400;
      line-height: 1.15;
      letter-spacing: -0.01em;
      margin: 16px 0 14px;
    }
    .hero-lede {
      max-width: 56ch;
      margin: 0 auto;
      color: var(--muted);
      font-size: 16px;
      line-height: 1.7;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(560px, 1fr));
      gap: 56px 40px;
    }
    .card {
      background: transparent;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .card-head { padding: 0; }
    .card-title {
      font-family: 'Noto Serif', Georgia, serif;
      font-size: 28px;
      font-weight: 400;
      line-height: 1.2;
      letter-spacing: -0.01em;
      margin: 8px 0 6px;
    }
    .card-desc { color: var(--muted); font-size: 15px; margin: 0 0 10px; max-width: 60ch; }
    .card-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      font-size: 12px;
      color: var(--fine);
      margin: 0 0 4px;
    }
    .card-meta code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      background: #efeded;
      padding: 3px 8px;
      border-radius: 0;
      color: var(--ink);
    }
    .card-meta .dot { color: var(--rule); }
    .open-link {
      color: var(--ink);
      text-decoration: none;
      border-bottom: 1px solid currentColor;
      padding-bottom: 1px;
      font-weight: 500;
    }
    .open-link:hover { color: var(--accent); }
    .frame-wrap {
      width: 100%;
      max-width: 600px;
      height: 760px;
      border: 1px solid var(--rule);
      background: var(--bg);
      overflow: auto;
      box-shadow: 0 1px 0 rgba(0,0,0,0.02);
    }
    .frame-wrap iframe {
      width: 600px;
      height: 1200px;
      border: 0;
      display: block;
      background: var(--bg);
    }
    .footnote {
      margin-top: 64px;
      padding-top: 32px;
      border-top: 1px solid var(--rule);
      text-align: center;
      color: var(--fine);
      font-size: 12px;
    }
    .footnote code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      background: #efeded;
      padding: 2px 6px;
    }
    @media (max-width: 640px) {
      .page { padding: 40px 20px 64px; }
      .grid { gap: 48px; }
      .frame-wrap { height: 640px; }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="hero">
      <p class="brand">${escapeHtml(COMPANY)}</p>
      <div class="brand-rule"></div>
      <p class="eyebrow">Internal · Design Review</p>
      <h1 class="hero-title">Transactional email previews</h1>
      <p class="hero-lede">
        Each card renders the production email at its true 600px viewport.
        Open in a new tab to inspect, or use Chrome DevTools' device toolbar
        for a faithful client preview.
      </p>
    </header>

    <section class="grid">
      ${cards.join('\n')}
    </section>

    <footer class="footnote">
      Rendered with the project's own <code>renderMjmlTemplate</code> from
      <code>src/modules/mail/templates/render.ts</code>. Re-run
      <code>npm run preview:emails</code> after any template change.
    </footer>
  </main>
</body>
</html>`;
}

function openInBrowser(target: string): void {
  const platform = process.platform;
  let cmd: string;
  let args: string[];
  if (platform === 'darwin') {
    cmd = 'open';
    args = [target];
  } else if (platform === 'win32') {
    cmd = 'cmd';
    args = ['/c', 'start', '""', target];
  } else {
    cmd = 'xdg-open';
    args = [target];
  }
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => {
      console.log(`  Could not auto-open. Open manually: ${target}`);
    });
    child.unref();
  } catch {
    console.log(`  Could not auto-open. Open manually: ${target}`);
  }
}
