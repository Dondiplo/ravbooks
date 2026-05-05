'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { reportsApi, invoicesApi, expensesApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState, TableSkeleton } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';

export default function CashFlowPage() {
  const now = dayjs();
  const [startDate, setStartDate] = useState(now.startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(now.endOf('month').format('YYYY-MM-DD'));

  const { data: cashFlow, isLoading } = useQuery({
    queryKey: ['cash-flow', startDate, endDate],
    queryFn: () => reportsApi.cashFlow({ startDate, endDate }),
  });

  const { data: inflows } = useQuery({
    queryKey: ['invoices-paid', startDate, endDate],
    queryFn: () => invoicesApi.list({ status: 'PAID', startDate, endDate, limit: 10 }),
  });

  const { data: outflows } = useQuery({
    queryKey: ['expenses-approved', startDate, endDate],
    queryFn: () => expensesApi.list({ status: 'APPROVED', startDate, endDate, limit: 10 }),
  });

  const { data: metrics } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: reportsApi.dashboard,
  });

  const chartData = metrics?.monthlyData ?? [];

  const openingBalance = parseFloat(String(cashFlow?.openingBalance ?? 0));
  const closingBalance = parseFloat(String(cashFlow?.closingBalance ?? 0));
  const netChange = parseFloat(String(cashFlow?.netChange ?? 0));
  const operatingTotal = parseFloat(String(cashFlow?.operating?.total ?? 0));

  return (
    <div>
      <Header title="Cash Flow" subtitle="Daily inflows, outflows and cash position" />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Date range */}
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <Input label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full sm:w-44" />
            <Input label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full sm:w-44" />
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Opening Balance</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{formatCurrency(openingBalance)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl"><DollarSign className="h-6 w-6 text-gray-500" /></div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Net Cash Change</p>
                <p className={`text-2xl font-bold mt-1 tabular-nums ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {netChange >= 0 ? '+' : ''}{formatCurrency(netChange)}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${netChange >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                {netChange >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                )}
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Closing Balance</p>
                <p className={`text-2xl font-bold mt-1 tabular-nums ${closingBalance >= 0 ? 'text-brand-600' : 'text-red-600'}`}>
                  {formatCurrency(closingBalance)}
                </p>
              </div>
              <div className="p-3 bg-brand-50 rounded-xl"><DollarSign className="h-6 w-6 text-brand-600" /></div>
            </div>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Cash Flow</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="revenue" name="Inflows" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Outflows" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 text-sm">No data</div>
          )}
        </Card>

        {/* Transactions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inflows */}
          <Card noPadding>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <h3 className="font-semibold text-gray-900">Cash Inflows</h3>
            </div>
            <Table>
              <Thead>
                <tr>
                  <Th>Invoice</Th>
                  <Th>Customer</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </Thead>
              <Tbody>
                {!inflows ? (
                  <TableSkeleton rows={5} cols={3} />
                ) : (inflows?.invoices ?? []).length === 0 ? (
                  <EmptyState message="No inflows" />
                ) : (
                  (inflows?.invoices ?? []).slice(0, 8).map((inv: Record<string, unknown>) => (
                    <Tr key={inv.id as string}>
                      <Td><span className="font-mono text-xs">{inv.invoiceNumber as string}</span></Td>
                      <Td className="max-w-xs truncate">{(inv.customer as Record<string, string>)?.name}</Td>
                      <Td align="right" className="font-semibold text-green-600 tabular-nums">
                        +{formatCurrency(inv.amountPaid as number)}
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Card>

          {/* Outflows */}
          <Card noPadding>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <h3 className="font-semibold text-gray-900">Cash Outflows</h3>
            </div>
            <Table>
              <Thead>
                <tr>
                  <Th>Description</Th>
                  <Th>Category</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </Thead>
              <Tbody>
                {!outflows ? (
                  <TableSkeleton rows={5} cols={3} />
                ) : (outflows?.expenses ?? []).length === 0 ? (
                  <EmptyState message="No outflows" />
                ) : (
                  (outflows?.expenses ?? []).slice(0, 8).map((exp: Record<string, unknown>) => (
                    <Tr key={exp.id as string}>
                      <Td className="max-w-xs truncate">{exp.description as string}</Td>
                      <Td className="text-gray-500">{(exp.category as string) ?? '—'}</Td>
                      <Td align="right" className="font-semibold text-red-600 tabular-nums">
                        -{formatCurrency(exp.total as number)}
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Card>
        </div>

        {/* Operating activities breakdown */}
        {cashFlow && (
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Operating Cash Flow Breakdown</h3>
            {(cashFlow.operating?.items ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">No operating cash flows in this period</p>
            ) : (
              <div className="space-y-2">
                {(cashFlow.operating?.items ?? []).map((item: Record<string, unknown>, i: number) => {
                  const amt = parseFloat(String(item.amount));
                  return (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-600">{item.description as string}</span>
                      <span className={`text-sm font-semibold tabular-nums ${amt >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {amt >= 0 ? '+' : ''}{formatCurrency(amt)}
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200 mt-2">
                  <span className="text-sm font-bold text-gray-900">Net Operating Cash Flow</span>
                  <span className={`text-sm font-bold tabular-nums ${operatingTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {operatingTotal >= 0 ? '+' : ''}{formatCurrency(operatingTotal)}
                  </span>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
