import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';
import { formatDateTime } from '../lib/format';

const PAGE_SIZE = 25;
const QUEUE_OPTIONS = ['', 'email-high', 'email-default'];
const STATE_OPTIONS = ['', 'created', 'retry', 'active', 'completed', 'failed', 'cancelled'];

export interface QueueStats {
  name: string;
  deferredCount: number;
  queuedCount: number;
  activeCount: number;
  totalCount: number;
  createdOn: string;
  updatedOn: string;
}

export interface Job {
  id: string;
  name: string;
  state: string;
  data: Record<string, unknown>;
  retryCount: number;
  retryLimit: number;
  createdOn: string;
  startedOn?: string;
  completedOn?: string;
}

export function JobsManager() {
  const [queues, setQueues] = useState<QueueStats[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [queueFilter, setQueueFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('createdOn');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const debouncedSearch = useDebounce(search.trim(), 400);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchQueues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<QueueStats[]>('/jobs/queues');
      setQueues(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue stats');
      setQueues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {
        page,
        limit: PAGE_SIZE,
        sortBy,
        sortOrder,
      };
      if (queueFilter) params.queue = queueFilter;
      if (stateFilter) params.state = stateFilter;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await api.getList<Job>('/jobs', params);
      setJobs(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch (err) {
      setJobs([]);
      setTotal(0);
    } finally {
      setJobsLoading(false);
    }
  }, [page, queueFilter, stateFilter, debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  useEffect(() => {
    setPage(1);
  }, [queueFilter, stateFilter, debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const handleRetry = async (queue: string, id: string) => {
    setActionError(null);
    setActioningId(id);
    try {
      await api.post(`/jobs/${queue}/${id}/retry`, {});
      await fetchJobs();
      await fetchQueues();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Retry failed');
    } finally {
      setActioningId(null);
    }
  };

  const handleCancel = async (queue: string, id: string) => {
    setActionError(null);
    setActioningId(id);
    try {
      await api.post(`/jobs/${queue}/${id}/cancel`, {});
      await fetchJobs();
      await fetchQueues();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setActioningId(null);
    }
  };

  const formatState = (state: string) => {
    return state.charAt(0).toUpperCase() + state.slice(1);
  };

  const stateColor = (state: string) => {
    switch (state) {
      case 'created':
      case 'retry':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const SortHeader = ({
    column,
    label,
  }: {
    column: string;
    label: string;
  }) => (
    <th
      role="columnheader"
      className="cursor-pointer select-none px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600/50"
      onClick={() => handleSort(column)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortBy === column && (
          <span className="text-slate-500" aria-hidden>
            {sortOrder === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </span>
    </th>
  );

  const dataPreview = (data: Record<string, unknown>) => {
    if (!data || Object.keys(data).length === 0) return '—';
    const type = data.type as string | undefined;
    const to = data.to as string | undefined;
    if (type && to) return `${type} → ${to}`;
    if (type) return type;
    const str = JSON.stringify(data);
    return str.length > 50 ? str.slice(0, 50) + '…' : str;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Background Jobs</h1>

      {/* Queue stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        {loading ? (
          <>
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
              />
            ))}
          </>
        ) : queues.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            No queue stats. Ensure pg-boss is running and DATABASE_URL is set.
          </div>
        ) : (
          queues.map((q) => (
            <div
              key={q.name}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{q.name}</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-600 dark:text-slate-400">Queued</span>
                <span className="font-medium">{q.queuedCount}</span>
                <span className="text-slate-600 dark:text-slate-400">Active</span>
                <span className="font-medium">{q.activeCount}</span>
                <span className="text-slate-600 dark:text-slate-400">Deferred</span>
                <span className="font-medium">{q.deferredCount}</span>
                <span className="text-slate-600 dark:text-slate-400">Total</span>
                <span className="font-medium">{q.totalCount}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {error && (
        <div
          className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      {actionError && (
        <div
          className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
          role="alert"
        >
          {actionError}
        </div>
      )}

      {/* Filters */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px]">
            <label htmlFor="search" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Search
            </label>
            <input
              id="search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ID, queue, state, type, email…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-500 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            />
          </div>
          <div>
            <label htmlFor="queue" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Queue
            </label>
            <select
              id="queue"
              value={queueFilter}
              onChange={(e) => setQueueFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">All</option>
              {QUEUE_OPTIONS.filter(Boolean).map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="state" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              State
            </label>
            <select
              id="state"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">All</option>
              {STATE_OPTIONS.filter(Boolean).map((s) => (
                <option key={s} value={s}>
                  {formatState(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setQueueFilter('');
                setStateFilter('');
                setSearch('');
                setSortBy('createdOn');
                setSortOrder('desc');
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Clear
            </button>
          </div>
        </div>
      </form>

      {/* Job list */}
      {jobsLoading ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Queue</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">State</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Data</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Created</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          No jobs match your filters.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <SortHeader column="id" label="ID" />
                    <SortHeader column="name" label="Queue" />
                    <SortHeader column="state" label="State" />
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Data</th>
                    <SortHeader column="retryCount" label="Retries" />
                    <SortHeader column="createdOn" label="Created" />
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                  {jobs.map((job) => (
                    <tr key={`${job.name}-${job.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400" title={job.id}>
                        {job.id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{job.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${stateColor(job.state)}`}>
                          {formatState(job.state)}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-sm text-slate-600 dark:text-slate-400" title={JSON.stringify(job.data, null, 2)}>
                        {dataPreview(job.data)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {job.retryCount}/{job.retryLimit}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {formatDateTime(job.createdOn)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {(job.state === 'failed' || job.state === 'retry') && (
                            <button
                              type="button"
                              onClick={() => handleRetry(job.name, job.id)}
                              disabled={actioningId === job.id}
                              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-700"
                            >
                              {actioningId === job.id ? '…' : 'Retry'}
                            </button>
                          )}
                          {(job.state === 'created' || job.state === 'retry') && (
                            <button
                              type="button"
                              onClick={() => handleCancel(job.name, job.id)}
                              disabled={actioningId === job.id}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

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
