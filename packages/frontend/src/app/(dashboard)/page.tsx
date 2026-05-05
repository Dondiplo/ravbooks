'use client';

import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  AlertTriangle,
  Package,
  DollarSign,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import { reportsApi, invoicesApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { StatusBadge } from '@/components/ui/Badge';
import { formatCurrency, formatDate, formatPercent } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: reportsApi.dashboard,
    refetchInterval: 60000,
  });

  const { data: invoiceData } = useQuery({
    queryKey: ['invoices', { limit: 5, status: 'OVERDUE' }],
    queryFn: () => invoicesApi.list({ limit: 5, page: 1 }),
  });

  const recentInvoices = invoiceData?.invoices?.slice(0, 5) ?? [];

  if (isLoading) {
    return (
      <div>
        <Header title="Dashboard" subtitle="Business overview" />
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const netProfit = metrics?.netProfit ?? 0;
  const profitMargin = metrics?.netProfitMargin ?? 0;

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle={`Overview for ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
        actions={
          <Link href="/invoices/new">
            <Button size="sm" leftIcon={<FileText className="h-4 w-4" />}>
              New Invoice
            </Button>
          </Link>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Revenue (This Month)"
            value={metrics?.totalRevenue ?? 0}
            icon={<TrendingUp className="h-5 w-5 text-brand-600" />}
            iconBg="bg-brand-50"
            subtitle="From paid invoices"
          />
          <StatsCard
            title="Expenses (This Month)"
            value={metrics?.totalExpenses ?? 0}
            icon={<TrendingDown className="h-5 w-5 text-red-600" />}
            iconBg="bg-red-50"
            subtitle="Approved expenses"
          />
          <StatsCard
            title="Net Profit"
            value={netProfit}
            icon={
              netProfit >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )
            }
            iconBg={netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}
            subtitle={`Margin: ${formatPercent(profitMargin)}`}
          />
          <StatsCard
            title="Outstanding Receivables"
            value={metrics?.totalReceivables ?? 0}
            icon={<DollarSign className="h-5 w-5 text-yellow-600" />}
            iconBg="bg-yellow-50"
            subtitle={`${metrics?.overdueInvoices ?? 0} overdue`}
          />
        </div>

        {/* Alerts Row */}
        {((metrics?.overdueInvoices ?? 0) > 0 || (metrics?.lowStockItems ?? 0) > 0) && (
          <div className="flex flex-wrap gap-3">
            {(metrics?.overdueInvoices ?? 0) > 0 && (
              <Link href="/invoices?status=OVERDUE">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 hover:bg-red-100 transition-colors cursor-pointer">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">{metrics?.overdueInvoices} overdue invoice{metrics?.overdueInvoices !== 1 ? 's' : ''}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            )}
            {(metrics?.lowStockItems ?? 0) > 0 && (
              <Link href="/inventory?lowStock=true">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-700 hover:bg-yellow-100 transition-colors cursor-pointer">
                  <Package className="h-4 w-4" />
                  <span className="font-medium">{metrics?.lowStockItems} low stock item{metrics?.lowStockItems !== 1 ? 's' : ''}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            )}
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Revenue vs Expenses</CardTitle>
              <span className="text-sm text-gray-500">Last 6 months</span>
            </CardHeader>
            {metrics?.monthlyData?.length ? (
              <RevenueChart data={metrics.monthlyData} />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                No data available
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <StatRow label="Profit Margin" value={formatPercent(profitMargin)} positive={profitMargin > 0} />
              <StatRow
                label="Total Receivables"
                value={formatCurrency(metrics?.totalReceivables ?? 0)}
              />
              <StatRow label="Overdue Invoices" value={String(metrics?.overdueInvoices ?? 0)} />
              <StatRow label="Low Stock Items" value={String(metrics?.lowStockItems ?? 0)} />
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
              <Link href="/reports">
                <Button variant="outline" size="sm" className="w-full">
                  View Full Reports
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Recent Invoices */}
        <Card noPadding>
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Invoices</h3>
            <Link href="/invoices" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentInvoices.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-400">No invoices yet</div>
            ) : (
              recentInvoices.map((inv: Record<string, unknown>) => (
                <Link key={inv.id as string} href={`/invoices/${inv.id}`}>
                  <div className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{inv.invoiceNumber as string}</p>
                        <p className="text-xs text-gray-500">{(inv.customer as Record<string, string>)?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-gray-900 tabular-nums">
                          {formatCurrency(inv.total as number)}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(inv.date as string)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 tabular-nums sm:hidden">
                        {formatCurrency(inv.total as number)}
                      </p>
                      <StatusBadge status={inv.status as string} />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={`text-sm font-semibold tabular-nums ${
          positive === true ? 'text-green-600' : positive === false ? 'text-red-600' : 'text-gray-900'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
