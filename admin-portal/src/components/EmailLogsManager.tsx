import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';
import { formatDateTime } from '../lib/format';

const PAGE_SIZE = 15;
const TYPE_OPTIONS = ['', 'order-confirmation', 'order-status-change', 'welcome', 'user-created'];
const STATUS_OPTIONS = ['', 'sent', 'failed'];

export interface EmailLog {
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

export function EmailLogsManager() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [orderIdSearch, setOrderIdSearch] = useState('');
  const debouncedEmail = useDebounce(emailSearch.trim(), 400);
  const debouncedOrderId = useDebounce(orderIdSearch.trim(), 400);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number | undefined> = {
        page,
        limit: PAGE_SIZE,
      };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      if (debouncedEmail) params.email = debouncedEmail;
      if (debouncedOrderId) params.orderId = debouncedOrderId;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const res = await api.getList<EmailLog>('/email-logs', params);
      setLogs(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email logs');
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, debouncedEmail, debouncedOrderId, fromDate, toDate]);

  useEffect(() => {
    setPage(1);
  }, [debouncedEmail, debouncedOrderId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const handleResend = async (id: string) => {
    setResendError(null);
    setResendingId(id);
    try {
      await api.post(`/email-logs/${id}/resend`, {});
      await fetchLogs();
    } catch (err) {
      setResendError(err instanceof Error ? err.message : 'Resend failed');
    } finally {
      setResendingId(null);
    }
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setTypeFilter('');
    setEmailSearch('');
    setOrderIdSearch('');
    setFromDate('');
    setToDate('');
    setPage(1);
    setError(null);
  };

  const formatType = (t: string) => {
    return t.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatError = (err: Record<string, unknown> | null): string => {
    if (!err) return '—';
    const text = typeof err.message === 'string' ? err.message : JSON.stringify(err);
    return text.length > 100 ? text.slice(0, 100) + '…' : text;
  };

  const errorTitle = (err: Record<string, unknown> | null): string => {
    if (!err) return '';
    return JSON.stringify(err, null, 2);
  };

  const formatContentPreview = (content: Record<string, unknown> | null): string => {
    if (!content) return '—';
    const text = typeof content.text === 'string' ? content.text : (typeof content.html === 'string' ? 'HTML' : '—');
    return text.length > 40 ? text.slice(0, 40) + '…' : text;
  };

  const openLogInNewTab = (logId: string) => {
    window.open(`/admin/email-logs/view?id=${logId}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Email Logs</h1>

      {/* Filters */}
      <form
        onSubmit={handleApplyFilters}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="text"
              value={emailSearch}
              onChange={(e) => setEmailSearch(e.target.value)}
              placeholder="Recipient email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            />
          </div>
          <div>
            <label htmlFor="orderId" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Order ID
            </label>
            <input
              id="orderId"
              type="text"
              value={orderIdSearch}
              onChange={(e) => setOrderIdSearch(e.target.value)}
              placeholder="Order ID"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            />
          </div>
          <div>
            <label htmlFor="fromDate" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              From date
            </label>
            <input
              id="fromDate"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="toDate" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              To date
            </label>
            <input
              id="toDate"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="type" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Type
            </label>
            <select
              id="type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">All</option>
              {TYPE_OPTIONS.filter(Boolean).map((t) => (
                <option key={t} value={t}>
                  {formatType(t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">All</option>
              {STATUS_OPTIONS.filter(Boolean).map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-700"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={handleClearFilters}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Clear
          </button>
        </div>
      </form>

      {error && (
        <div
          className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      {resendError && (
        <div
          className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
          role="alert"
        >
          {resendError}
        </div>
      )}

      {loading ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">To</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Subject</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Sent at</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Content</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          No email logs match your filters.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                      To
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Sent at
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Content
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Error
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openLogInNewTab(log.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openLogInNewTab(log.id);
                        }
                      }}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-500"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400" title={log.id}>
                        {log.id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                        {formatType(log.type)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{log.to}</td>
                      <td className="max-w-xs truncate px-4 py-3 text-sm text-slate-700 dark:text-slate-300" title={log.subject}>
                        {log.subject}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            log.status === 'sent'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="max-w-48 truncate px-4 py-3 text-sm text-slate-600 dark:text-slate-400" title={log.content ? JSON.stringify(log.content, null, 2) : ''}>
                        {formatContentPreview(log.content)}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-sm text-red-600 dark:text-red-400" title={errorTitle(log.error)}>
                        {formatError(log.error)}
                      </td>
                      <td className="px-4 py-3">
                        {log.status === 'failed' && !log.resentLogId && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResend(log.id);
                            }}
                            disabled={resendingId === log.id}
                            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-700"
                          >
                            {resendingId === log.id ? 'Resending…' : 'Resend'}
                          </button>
                        )}
                        {log.status === 'failed' && log.resentLogId && (
                          <a
                            href={`/admin/email-logs/view?id=${log.resentLogId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-medium text-green-600 hover:underline dark:text-green-400"
                          >
                            View resent
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
