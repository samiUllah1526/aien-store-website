import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { hasPermission } from '../lib/auth';
import { useDebounce } from '../hooks/useDebounce';
import { toastSuccess } from '../lib/toast';

const PAGE_SIZE = 15;

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface AdminReview {
  id: string;
  productId: string;
  productName: string | null;
  productSlug: string | null;
  userId: string;
  orderId: string | null;
  authorName: string;
  authorEmail: string;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  isVerified: boolean;
  adminReply: string | null;
  adminReplyAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'APPROVED', label: 'Published' },
  { value: 'REJECTED', label: 'Hidden' },
  { value: 'PENDING', label: 'Pending' },
];

function Stars({ value }: { value: number }) {
  return (
    <span className="whitespace-nowrap text-amber-500" aria-label={`${value} out of 5`}>
      {'★'.repeat(Math.max(0, Math.min(5, value)))}
      <span className="text-slate-300 dark:text-slate-600">{'★'.repeat(5 - Math.max(0, Math.min(5, value)))}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const map: Record<ReviewStatus, { label: string; cls: string }> = {
    APPROVED: {
      label: 'Published',
      cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    REJECTED: {
      label: 'Hidden',
      cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    },
    PENDING: {
      label: 'Pending',
      cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    },
  };
  const s = map[status];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

export function ReviewsManager() {
  const [items, setItems] = useState<AdminReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [replyTarget, setReplyTarget] = useState<AdminReview | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const debouncedSearch = useDebounce(searchInput.trim(), 400);

  const canRead = hasPermission('reviews:read');
  const canModerate = hasPermission('reviews:moderate');

  const fetchList = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number | undefined> = {
        page,
        limit: PAGE_SIZE,
        sortBy,
        sortOrder: 'desc',
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter) params.status = statusFilter;
      const res = await api.getList<AdminReview>('/reviews', params);
      setItems(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [canRead, page, debouncedSearch, statusFilter, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const setStatus = async (r: AdminReview, status: ReviewStatus) => {
    setBusyId(r.id);
    setError(null);
    try {
      await api.patch(`/reviews/${r.id}/status`, { status });
      toastSuccess(status === 'APPROVED' ? 'Review published' : status === 'REJECTED' ? 'Review hidden' : 'Review set to pending');
      fetchList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (r: AdminReview) => {
    if (!confirm('Delete this review permanently? This cannot be undone.')) return;
    setBusyId(r.id);
    setError(null);
    try {
      await api.delete(`/reviews/${r.id}`);
      toastSuccess('Review deleted');
      fetchList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setBusyId(null);
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-12 dark:border-slate-700 dark:bg-slate-800">
          <div className="mx-auto h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
        </div>
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        You don't have permission to view reviews.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Reviews</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Verified-purchase reviews publish automatically. Hide anything abusive, reply publicly, or delete.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="review-search" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Search
          </label>
          <input
            id="review-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Author, email, title or text"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
          />
        </div>
        <div className="w-40">
          <label htmlFor="review-status" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Status
          </label>
          <select
            id="review-status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-36">
          <label htmlFor="review-sort" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Sort by
          </label>
          <select
            id="review-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="createdAt">Date</option>
            <option value="rating">Rating</option>
            <option value="status">Status</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            setSearchInput('');
            setStatusFilter('');
            setPage(1);
            setError(null);
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Clear
        </button>
      </form>

      {loading ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <div className="mx-auto h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          {debouncedSearch || statusFilter ? 'No reviews match your filters.' : 'No reviews yet.'}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Product</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Rating</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Review</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Date</th>
                    {canModerate && (
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800">
                  {items.map((r) => (
                    <tr key={r.id} className="align-top">
                      <td className="px-4 py-3 text-sm">
                        {r.productSlug ? (
                          <a
                            href={`/admin/products?highlight=${r.productId}`}
                            className="font-medium text-slate-900 hover:text-slate-600 dark:text-slate-100 dark:hover:text-slate-300"
                          >
                            {r.productName ?? 'Product'}
                          </a>
                        ) : (
                          <span className="font-medium text-slate-900 dark:text-slate-100">{r.productName ?? 'Product'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Stars value={r.rating} />
                      </td>
                      <td className="max-w-md px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {r.title && <p className="font-medium text-slate-900 dark:text-slate-100">{r.title}</p>}
                        <p className="line-clamp-2 whitespace-pre-line">{r.body}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <span>{r.authorName}</span>
                          <span aria-hidden>·</span>
                          <span>{r.authorEmail}</span>
                          {r.isVerified && (
                            <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              ✓ Verified
                            </span>
                          )}
                        </p>
                        {r.adminReply && (
                          <p className="mt-2 border-l-2 border-slate-300 pl-2 text-xs italic text-slate-500 dark:border-slate-600 dark:text-slate-400">
                            Your reply: {r.adminReply}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      {canModerate && (
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                          {r.status !== 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => setStatus(r, 'APPROVED')}
                              disabled={busyId === r.id}
                              className="mr-2 font-medium text-emerald-600 hover:text-emerald-800 disabled:opacity-50 dark:text-emerald-400 dark:hover:text-emerald-300"
                            >
                              Publish
                            </button>
                          )}
                          {r.status !== 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => setStatus(r, 'REJECTED')}
                              disabled={busyId === r.id}
                              className="mr-2 font-medium text-amber-600 hover:text-amber-800 disabled:opacity-50 dark:text-amber-400 dark:hover:text-amber-300"
                            >
                              Hide
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setReplyTarget(r)}
                            disabled={busyId === r.id}
                            className="mr-2 font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-100"
                          >
                            {r.adminReply ? 'Edit reply' : 'Reply'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(r)}
                            disabled={busyId === r.id}
                            className="font-medium text-red-600 hover:text-red-800 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                          >
                            {busyId === r.id ? '…' : 'Delete'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
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

      {replyTarget && (
        <ReplyModal
          review={replyTarget}
          onClose={() => setReplyTarget(null)}
          onSaved={() => {
            setReplyTarget(null);
            fetchList();
          }}
        />
      )}
    </div>
  );
}

function ReplyModal({
  review,
  onClose,
  onSaved,
}: {
  review: AdminReview;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [reply, setReply] = useState(review.adminReply ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (clear = false) => {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/reviews/${review.id}/reply`, { reply: clear ? '' : reply.trim() });
      toastSuccess(clear ? 'Reply removed' : 'Reply saved');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reply');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reply-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="reply-modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Reply to review
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-700/40">
          <div className="mb-1">
            <Stars value={review.rating} />
          </div>
          {review.title && <p className="font-medium text-slate-900 dark:text-slate-100">{review.title}</p>}
          <p className="whitespace-pre-line text-slate-600 dark:text-slate-300">{review.body}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">— {review.authorName}</p>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300" role="alert">
            {error}
          </div>
        )}

        <label htmlFor="reply-text" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Public reply
        </label>
        <textarea
          id="reply-text"
          value={reply}
          rows={4}
          maxLength={4000}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Thank the customer or address their feedback…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
        />

        <div className="mt-6 flex items-center justify-between gap-2">
          {review.adminReply ? (
            <button
              type="button"
              onClick={() => save(true)}
              disabled={saving}
              className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
            >
              Remove reply
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => save(false)}
              disabled={saving || !reply.trim()}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-500"
            >
              {saving ? 'Saving…' : 'Save reply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
