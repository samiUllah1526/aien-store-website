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

  const chartGrid = isDark ? '#475569' : '#e2e8f0';
  const chartText = isDark ? '#94a3b8' : '#64748b';
  const chartStroke = isDark ? '#cbd5e1' : '#0f172a';

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

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total products</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{s.totalProducts}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total orders</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{s.totalOrders}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending</p>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{s.ordersByStatus.PENDING}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Shipped</p>
          <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{s.ordersByStatus.SHIPPED}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Delivered</p>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{s.ordersByStatus.DELIVERED}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Cancelled</p>
          <p className="mt-1 text-2xl font-bold text-slate-500 dark:text-slate-400">{s.ordersByStatus.CANCELLED}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
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
                    contentStyle={{
                      borderRadius: '8px',
                      border: `1px solid ${chartGrid}`,
                      backgroundColor: isDark ? '#1e293b' : '#fff',
                      color: isDark ? '#e2e8f0' : '#0f172a',
                    }}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.date
                        ? formatDateTime(payload[0].payload.date)
                        : ''
                    }
                    formatter={(value: number) => [value, 'Orders']}
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

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
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
                    contentStyle={{
                      borderRadius: '8px',
                      border: `1px solid ${chartGrid}`,
                      backgroundColor: isDark ? '#1e293b' : '#fff',
                      color: isDark ? '#e2e8f0' : '#0f172a',
                    }}
                    formatter={(value: number) => [formatMoney((value as number) * 100, 'PKR'), 'Sales']}
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

    </div>
  );
}
