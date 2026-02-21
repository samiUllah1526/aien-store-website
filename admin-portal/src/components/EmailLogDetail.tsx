import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';

export interface EmailLogDetailData {
  id: string;
  type: string;
  to: string;
  subject: string;
  status: string;
  error: Record<string, unknown> | null;
  content: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  resentLogId: string | null;
  createdAt: string;
}

interface EmailLogDetailProps {
  id?: string;
}

function formatType(t: string) {
  return t.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

export function EmailLogDetail({ id: idProp }: EmailLogDetailProps) {
  const id = idProp ?? getIdFromUrl();
  const [log, setLog] = useState<EmailLogDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('No log ID provided');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<EmailLogDetailData>(`/email-logs/${id}`);
        if (!cancelled && res.data) setLog(res.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load log');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleResend = async () => {
    if (!log || log.status !== 'failed' || log.resentLogId) return;
    setResendMessage(null);
    setResending(true);
    try {
      const res = await api.post<{ message?: string }>(`/email-logs/${id}/resend`, {});
      setResendMessage(res.message ?? 'Resent successfully');
      const updated = await api.get<EmailLogDetailData>(`/email-logs/${id}`);
      if (updated.data) setLog(updated.data);
    } catch (err) {
      setResendMessage(err instanceof Error ? err.message : 'Resend failed');
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-600 dark:border-t-slate-300" />
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
        <p className="font-medium">{error ?? 'Log not found'}</p>
        <a
          href="/admin/email-logs"
          className="mt-3 inline-block text-sm underline focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          ← Back to Email Logs
        </a>
      </div>
    );
  }

  const content = log.content as { subject?: string; html?: string; text?: string } | null;

  return (
    <div className="space-y-6">
      {/* Back link + Resend */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a
          href="/admin/email-logs"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Email Logs
        </a>
        {log.status === 'failed' && !log.resentLogId && (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-700"
          >
            {resending ? 'Resending…' : 'Resend'}
          </button>
        )}
        {log.status === 'failed' && log.resentLogId && (
          <a
            href={`/admin/email-logs/view?id=${log.resentLogId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
          >
            Successfully resent — View successful log
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {resendMessage && (
        <div
          className={`rounded-lg p-4 text-sm ${resendMessage.includes('failed') ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300' : 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300'}`}
        >
          {resendMessage}
        </div>
      )}

      {/* Meta card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Log details
        </h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Type</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">{formatType(log.type)}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">To</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">{log.to}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Subject</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">{log.subject}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Status</dt>
            <dd>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  log.status === 'sent'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                }`}
              >
                {log.status}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Sent at</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">{formatDateTime(log.createdAt)}</dd>
          </div>
        </dl>
      </div>

      {/* Error section */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Error
        </h2>
        <div className="p-4">
          {log.error ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-100 p-4 font-mono text-sm text-slate-800 dark:bg-slate-900 dark:text-slate-200">
              {JSON.stringify(log.error, null, 2)}
            </pre>
          ) : (
            <p className="text-slate-500 dark:text-slate-400">No error recorded for this log.</p>
          )}
        </div>
      </section>

      {/* Content section – live email preview */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Email content
        </h2>
        <div className="p-4">
          {content ? (
            <>
              <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-900">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Subject</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {content.subject ?? '—'}
                </p>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900">
                {typeof content.html === 'string' ? (
                  <div
                    className="min-w-0"
                    dangerouslySetInnerHTML={{ __html: content.html }}
                  />
                ) : typeof content.text === 'string' ? (
                  <pre className="whitespace-pre-wrap wrap-break-word p-4 font-sans text-sm text-slate-800 dark:text-slate-200">
                    {content.text}
                  </pre>
                ) : (
                  <pre className="overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-sm text-slate-800 dark:text-slate-200">
                    {JSON.stringify(content, null, 2)}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <p className="text-slate-500 dark:text-slate-400">No content stored for this log.</p>
          )}
        </div>
      </section>
    </div>
  );
}
