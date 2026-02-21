/**
 * Voucher detail page: usage timeline, linked orders, audit logs.
 */
import { useState, useEffect, useCallback } from 'react';
import { api, getApiBaseUrl } from '../lib/api';
import { formatMoney } from '../lib/formatMoney';
import { formatDateTime } from '../lib/format';
import type { Voucher, VoucherStats } from '../lib/types';

interface VoucherAuditLog {
  id: string;
  voucherId: string | null;
  action: string;
  actorType: string;
  actorId: string | null;
  orderId: string | null;
  code: string | null;
  result: string | null;
  errorCode: string | null;
  metadata: Record<string, unknown> | null;
  requestId: string | null;
  createdAt: string;
}

interface RedemptionWithOrder {
  id: string;
  orderId: string;
  userId: string | null;
  createdAt: string;
  order?: { id: string; discountCents: number; totalCents: number; createdAt: string };
}

interface VoucherDetailProps {
  voucherId: string;
}

function formatVoucherValue(v: Voucher): string {
  switch (v.type) {
    case 'PERCENTAGE':
      return `${v.value}% off`;
    case 'FIXED_AMOUNT':
      return `${formatMoney(v.value, 'PKR')} off`;
    case 'FREE_SHIPPING':
      return 'Free shipping';
    default:
      return '—';
  }
}

function actionLabel(a: string): string {
  return a.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function getIdFromQuery(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('id')?.trim() ?? '';
}

export function VoucherDetail({ voucherId: propId }: VoucherDetailProps) {
  const voucherId = (propId && propId.trim()) || getIdFromQuery();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [stats, setStats] = useState<VoucherStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<VoucherAuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVoucher = useCallback(async () => {
    if (!voucherId) return;
    try {
      const res = await api.get<Voucher>(`/vouchers/${voucherId}`);
      if (res.data) setVoucher(res.data);
    } catch {
      setVoucher(null);
    }
  }, [voucherId]);

  const fetchStats = useCallback(async () => {
    if (!voucherId) return;
    try {
      const res = await api.get<VoucherStats>(`/vouchers/${voucherId}/stats`);
      if (res.data) setStats(res.data);
    } catch {
      setStats(null);
    }
  }, [voucherId]);

  const fetchAuditLogs = useCallback(async () => {
    if (!voucherId) return;
    try {
      const res = await api.getList<VoucherAuditLog>(`/vouchers/${voucherId}/audit-logs`, {
        page: auditPage,
        limit: 20,
      });
      setAuditLogs(res.data ?? []);
      setAuditTotal(res.meta?.total ?? 0);
    } catch {
      setAuditLogs([]);
      setAuditTotal(0);
    }
  }, [voucherId, auditPage]);

  useEffect(() => {
    if (!voucherId) {
      setLoading(false);
      setError('No voucher ID');
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setError(`Request timed out. Check the API is running at ${getApiBaseUrl()}`);
        setLoading(false);
      }
    }, 15000);
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchVoucher(), fetchStats()]);
        await fetchAuditLogs();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) {
          window.clearTimeout(timeout);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [voucherId]);

  useEffect(() => {
    if (voucherId) fetchAuditLogs();
  }, [voucherId, auditPage, fetchAuditLogs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-600 dark:border-t-slate-300" />
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
        <p className="font-medium">{error ?? 'Voucher not found'}</p>
        <a href="/admin/vouchers" className="mt-3 inline-block text-sm underline">
          ← Back to Vouchers
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <a href="/admin/vouchers" className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
            ← Vouchers
          </a>
          <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
            {voucher.code}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {formatVoucherValue(voucher)} · {voucher.isActive ? 'Active' : 'Inactive'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Type</dt>
              <dd>{voucher.type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Value</dt>
              <dd>{formatVoucherValue(voucher)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Start</dt>
              <dd>{formatDateTime(voucher.startDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Expiry</dt>
              <dd>{formatDateTime(voucher.expiryDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Used</dt>
              <dd>{voucher.usedCount}{voucher.usageLimitGlobal != null ? ` / ${voucher.usageLimitGlobal}` : ''}</dd>
            </div>
          </dl>
        </section>

        {stats && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Usage</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Redemptions</dt>
                <dd>{stats.totalRedemptions}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Revenue impact</dt>
                <dd className="text-red-600 dark:text-red-400">-{formatMoney(stats.revenueImpactCents, 'PKR')}</dd>
              </div>
              {stats.remainingUses != null && (
                <div className="flex justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">Remaining uses</dt>
                  <dd>{stats.remainingUses}</dd>
                </div>
              )}
            </dl>
            {stats.redemptions && stats.redemptions.length > 0 && (
              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-600">
                <h3 className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Linked orders</h3>
                <ul className="space-y-1 text-sm">
                  {stats.redemptions.map((r) => (
                    <li key={r.id}>
                      <a href={`/admin/orders?orderId=${r.orderId}`} className="text-slate-700 underline hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
                        Order {r.orderId.slice(0, 8)}… — {formatMoney(r.order.discountCents, 'PKR')} off
                      </a>
                      <span className="ml-2 text-slate-500 dark:text-slate-400">{formatDateTime(r.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Action logs</h2>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No audit logs yet.</p>
        ) : (
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-700/50"
              >
                <span className="font-medium">{actionLabel(log.action)}</span>
                {log.result && (
                  <span className={`rounded px-1.5 py-0.5 text-xs ${log.result === 'VALID' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                    {log.result}
                  </span>
                )}
                {log.orderId && (
                  <a href={`/admin/orders?orderId=${log.orderId}`} className="text-slate-600 underline hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
                    Order {log.orderId.slice(0, 8)}…
                  </a>
                )}
                <span className="ml-auto text-slate-500 dark:text-slate-400">
                  {formatDateTime(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
        {auditTotal > 20 && (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={auditPage <= 1}
              onClick={() => setAuditPage((p) => p - 1)}
              className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={auditPage * 20 >= auditTotal}
              onClick={() => setAuditPage((p) => p + 1)}
              className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
