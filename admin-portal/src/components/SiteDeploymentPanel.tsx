import { useState, useEffect, useCallback, useRef } from 'react';
import { hasPermission } from '../lib/auth';
import {
  deployMainWebsite,
  getMainWebsiteDeployStatus,
  type MainWebsiteDeployStatusData,
} from '../lib/api';

const POLL_MS = 9000;
const MAX_POLLS = 45;

function formatRunLabel(run: MainWebsiteDeployStatusData['run']): string {
  if (!run) return 'No runs found yet';
  if (run.status === 'queued') return 'Queued';
  if (run.status === 'in_progress') return 'In progress';
  if (run.status === 'completed') {
    if (run.conclusion === 'success') return 'Succeeded';
    if (run.conclusion === 'failure') return 'Failed';
    if (run.conclusion === 'cancelled') return 'Cancelled';
    if (run.conclusion === 'skipped') return 'Skipped';
    return run.conclusion ?? 'Completed';
  }
  return run.status;
}

function statusBadgeClass(run: MainWebsiteDeployStatusData['run']): string {
  if (!run) return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
  if (run.status === 'queued' || run.status === 'in_progress') {
    return 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100';
  }
  if (run.status === 'completed') {
    if (run.conclusion === 'success') {
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100';
    }
    if (run.conclusion === 'failure') {
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100';
    }
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
}

export function SiteDeploymentPanel() {
  const canDeploy = hasPermission('deploy:website');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [lastActionsUrl, setLastActionsUrl] = useState<string | null>(null);

  const [status, setStatus] = useState<MainWebsiteDeployStatusData | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [pollAfterDeploy, setPollAfterDeploy] = useState(false);
  const pollCountRef = useRef(0);

  const loadStatus = useCallback(async () => {
    setStatusError(null);
    try {
      const data = await getMainWebsiteDeployStatus();
      setStatus(data);
    } catch (e) {
      setStatus(null);
      setStatusError(e instanceof Error ? e.message : 'Could not load deploy status');
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!pollAfterDeploy) {
      pollCountRef.current = 0;
      return;
    }
    let cancelled = false;
    const id = setInterval(() => {
      void (async () => {
        if (cancelled) return;
        pollCountRef.current += 1;
        try {
          const data = await getMainWebsiteDeployStatus();
          if (cancelled) return;
          setStatus(data);
          setStatusError(null);
          const r = data.run;
          const done =
            r?.status === 'completed' || pollCountRef.current >= MAX_POLLS;
          if (done) setPollAfterDeploy(false);
        } catch (e) {
          if (!cancelled) {
            setStatusError(e instanceof Error ? e.message : 'Status check failed');
          }
        }
      })();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollAfterDeploy]);

  const handleRebuild = async () => {
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
      setStatusLoading(true);
      await loadStatus();
      pollCountRef.current = 0;
      setPollAfterDeploy(true);
    } catch {
      // Error already surfaced via toast from api layer
    } finally {
      setBusy(false);
      setStatusLoading(false);
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

  const actionsUrl = status?.actionsUrl;
  const run = status?.run;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Latest deployment</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Status of the most recent GitHub Actions run for the main-website workflow on branch{' '}
          <code className="rounded bg-slate-100 px-1 text-xs dark:bg-slate-700">main</code>.
        </p>

        {statusLoading && !status && (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading status…</p>
        )}

        {statusError && (
          <p className="mt-4 text-sm text-red-700 dark:text-red-300">{statusError}</p>
        )}

        {status && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClass(run)}`}
              >
                {formatRunLabel(run)}
              </span>
              {run && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Updated {new Date(run.updatedAt).toLocaleString()}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setStatusLoading(true);
                void loadStatus().finally(() => setStatusLoading(false));
              }}
              disabled={statusLoading}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {statusLoading ? 'Refreshing…' : 'Refresh status'}
            </button>
          </div>
        )}

        {status && (
          <div className="mt-4 flex flex-col gap-2 text-sm">
            {actionsUrl && (
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">All workflows: </span>
                <a
                  href={actionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-slate-900 underline hover:text-slate-700 dark:text-slate-100 dark:hover:text-white"
                >
                  {actionsUrl}
                </a>
              </div>
            )}
            {run?.htmlUrl && (
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">This run: </span>
                <a
                  href={run.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-slate-900 underline hover:text-slate-700 dark:text-slate-100 dark:hover:text-white"
                >
                  Open run on GitHub
                </a>
              </div>
            )}
          </div>
        )}

        {pollAfterDeploy && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Checking status every few seconds until the run finishes…
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Rebuild main website</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Triggers the same GitHub Actions workflow used for production: it installs dependencies, builds the Astro
          storefront, and deploys to Cloudflare Pages. Latest status is shown above.
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
            onClick={() => void handleRebuild()}
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
          <p className="mt-2 text-xs text-emerald-800/90 dark:text-emerald-200/90">
            Status below updates automatically after you queue a rebuild.
          </p>
        </div>
      )}
    </div>
  );
}
