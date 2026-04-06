import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { api, getAuthToken } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { formatMoney } from '../lib/formatMoney';
import type { DashboardStats } from '../lib/dashboard-types';

function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    window.addEventListener('themechange', check);
    return () => window.removeEventListener('themechange', check);
  }, []);
  return isDark;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const isDark = useIsDark();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!getAuthToken()) {
      window.location.href = '/admin/login';
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<DashboardStats>('/dashboard/stats', { days })
      .then((res) => {
        if (!cancelled && res.data) setStats(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
              <div className="mt-2 h-8 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50" />
          <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50" />
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300" role="alert">
          {error}
        </div>
      </div>
    );
  }

  const s = stats!;
  const ordersOverTimeData = s.ordersOverTime.map((x) => ({
    ...x,
    dateLabel: formatDateTime(x.date),
  }));
  const salesByCategoryData = s.salesByCategory.map((x) => ({
    ...x,
    total: Math.round(x.totalCents / 100),
  }));
  const promoOverTimeData = (s.promotionOverTime ?? []).map((x) => ({
    ...x,
    dateLabel: formatDateTime(x.date),
    campaignRevenue: Math.round(x.campaignRevenueCents / 100),
    campaignSavings: Math.round(x.campaignSavingsCents / 100),
    voucherDiscount: Math.round(x.voucherDiscountCents / 100),
  }));
  const topCampaignsData = (s.topCampaigns ?? []).map((x) => ({
    ...x,
    revenue: Math.round(x.revenueCents / 100),
    savings: Math.round(x.savingsCents / 100),
  }));

  const chartGrid = isDark ? '#475569' : '#e2e8f0';
  const chartText = isDark ? '#94a3b8' : '#64748b';
  const chartStroke = isDark ? '#cbd5e1' : '#0f172a';

  const tooltipStyle = {
    borderRadius: '8px',
    border: `1px solid ${chartGrid}`,
    backgroundColor: isDark ? '#1e293b' : '#fff',
    color: isDark ? '#e2e8f0' : '#0f172a',
  };

  const cardCls = 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800';
  const cardLabel = 'text-sm font-medium text-slate-500 dark:text-slate-400';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300" role="alert">
          {error}
        </div>
      )}

      {/* Order summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className={cardCls}>
          <p className={cardLabel}>Total products</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{s.totalProducts}</p>
        </div>
        <div className={cardCls}>
          <p className={cardLabel}>Total orders</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{s.totalOrders}</p>
        </div>
        <div className={cardCls}>
          <p className={cardLabel}>Pending</p>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{s.ordersByStatus.PENDING}</p>
        </div>
        <div className={cardCls}>
          <p className={cardLabel}>Shipped</p>
          <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{s.ordersByStatus.SHIPPED}</p>
        </div>
        <div className={cardCls}>
          <p className={cardLabel}>Delivered</p>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{s.ordersByStatus.DELIVERED}</p>
        </div>
        <div className={cardCls}>
          <p className={cardLabel}>Cancelled</p>
          <p className="mt-1 text-2xl font-bold text-slate-500 dark:text-slate-400">{s.ordersByStatus.CANCELLED}</p>
        </div>
      </div>

      {/* Promotions summary cards */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Promotions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className={cardCls}>
            <p className={cardLabel}>Active campaigns</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{s.activeCampaigns ?? 0}</p>
          </div>
          <div className={cardCls}>
            <p className={cardLabel}>Campaign revenue</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{formatMoney(s.campaignRevenueCents ?? 0, 'PKR')}</p>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">in selected period</p>
          </div>
          <div className={cardCls}>
            <p className={cardLabel}>Campaign savings</p>
            <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{formatMoney(s.campaignSavingsCents ?? 0, 'PKR')}</p>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">discount given away</p>
          </div>
          <div className={cardCls}>
            <p className={cardLabel}>Active vouchers</p>
            <p className="mt-1 text-2xl font-bold text-violet-600 dark:text-violet-400">{s.activeVouchers ?? 0}</p>
          </div>
          <div className={cardCls}>
            <p className={cardLabel}>Voucher redemptions</p>
            <p className="mt-1 text-2xl font-bold text-violet-600 dark:text-violet-400">{s.voucherRedemptionsCount ?? 0}</p>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">in selected period</p>
          </div>
        </div>
      </div>

      {/* Order charts */}
      <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-2">
        <div className={cardCls}>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Orders over time</h2>
          <div className="h-80">
            {ordersOverTimeData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
                No orders in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ordersOverTimeData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 12, fill: chartText }}
                    stroke={chartText}
                  />
                  <YAxis tick={{ fontSize: 12, fill: chartText }} stroke={chartText} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.date
                        ? formatDateTime(payload[0].payload.date)
                        : ''
                    }
                    formatter={(value: number | undefined) => [value ?? 0, 'Orders']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Orders"
                    stroke={chartStroke}
                    strokeWidth={2}
                    dot={{ fill: chartStroke, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className={cardCls}>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Sales by category</h2>
          <div className="h-80">
            {salesByCategoryData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
                No sales data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={salesByCategoryData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: chartText }} stroke={chartText} />
                  <YAxis
                    type="category"
                    dataKey="categoryName"
                    width={70}
                    tick={{ fontSize: 11, fill: chartText }}
                    stroke={chartText}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number | undefined) => [formatMoney((value ?? 0) * 100, 'PKR'), 'Sales']}
                    labelFormatter={(label) => label}
                  />
                  <Bar
                    dataKey="total"
                    name="Sales"
                    fill={isDark ? '#64748b' : '#334155'}
                    radius={[0, 4, 4, 0]}
                    unit=" PKR"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Promotion charts */}
      <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-2">
        <div className={cardCls}>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Promotion impact over time</h2>
          <div className="h-80">
            {promoOverTimeData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
                No promotion data in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={promoOverTimeData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 12, fill: chartText }} stroke={chartText} />
                  <YAxis tick={{ fontSize: 12, fill: chartText }} stroke={chartText} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.date
                        ? formatDateTime(payload[0].payload.date)
                        : ''
                    }
                    formatter={(value: number | undefined, name: string) => [
                      formatMoney((value ?? 0) * 100, 'PKR'),
                      name,
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="campaignRevenue"
                    name="Campaign revenue"
                    stroke={isDark ? '#34d399' : '#059669'}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="campaignSavings"
                    name="Campaign discounts"
                    stroke={isDark ? '#f87171' : '#dc2626'}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="voucherDiscount"
                    name="Voucher discounts"
                    stroke={isDark ? '#a78bfa' : '#7c3aed'}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className={cardCls}>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Top campaigns by revenue</h2>
          <div className="h-80">
            {topCampaignsData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
                No campaign orders in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topCampaignsData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: chartText }} stroke={chartText} />
                  <YAxis
                    type="category"
                    dataKey="campaignName"
                    width={120}
                    tick={{ fontSize: 11, fill: chartText }}
                    stroke={chartText}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number | undefined, name: string) => {
                      if (name === 'Items sold') return [value ?? 0, name];
                      return [formatMoney((value ?? 0) * 100, 'PKR'), name];
                    }}
                    labelFormatter={(label) => label}
                  />
                  <Legend />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill={isDark ? '#34d399' : '#059669'}
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="savings"
                    name="Discounts given"
                    fill={isDark ? '#f87171' : '#dc2626'}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
