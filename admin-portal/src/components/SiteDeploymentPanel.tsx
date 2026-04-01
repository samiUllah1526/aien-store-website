import { useState } from 'react';
import { hasPermission } from '../lib/auth';
import { deployMainWebsite } from '../lib/api';

export function SiteDeploymentPanel() {
  const canDeploy = hasPermission('deploy:website');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [lastActionsUrl, setLastActionsUrl] = useState<string | null>(null);

  const run = async () => {
    if (
      !window.confirm(
        'Queue a full rebuild and deploy of the main (storefront) website? This runs GitHub Actions and may take several minutes. A new run can cancel one already in progress.',
      )
    ) {
      return;
    }
    setLastActionsUrl(null);
    setBusy(true);
    try {
      const { actionsUrl } = await deployMainWebsite(reason.trim() || undefined);
      setLastActionsUrl(actionsUrl);
    } catch {
      // Error already surfaced via toast from api layer
    } finally {
      setBusy(false);
    }
  };

  if (!canDeploy) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        You do not have permission to deploy the main website. This action requires the{' '}
        <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">deploy:website</code> permission
        (Super Admin by default). Sign out and back in after your role was updated.
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Rebuild main website</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Triggers the same GitHub Actions workflow used for production: it installs dependencies, builds the Astro
          storefront, and deploys to Cloudflare Pages. Monitor progress in GitHub Actions.
        </p>

        <label htmlFor="deploy-reason" className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Note for the workflow run (optional)
        </label>
        <textarea
          id="deploy-reason"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. After bulk product image updates"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          disabled={busy}
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void run()}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {busy ? 'Queueing…' : 'Rebuild main website'}
          </button>
        </div>
      </div>

      {lastActionsUrl && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
          <p>Rebuild queued. Open GitHub Actions to watch the run:</p>
          <a
            href={lastActionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block font-medium text-emerald-800 underline hover:text-emerald-900 dark:text-emerald-200"
          >
            {lastActionsUrl}
          </a>
        </div>
      )}
    </div>
  );
}
