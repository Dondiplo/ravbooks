'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { reportsApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';

type ReportType = 'income-statement' | 'balance-sheet' | 'cash-flow' | 'aging';

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('income-statement');
  const now = dayjs();
  const [startDate, setStartDate] = useState(now.startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(now.endOf('month').format('YYYY-MM-DD'));
  const [asOfDate, setAsOfDate] = useState(now.format('YYYY-MM-DD'));

  const { data: incomeStatement, isLoading: isLoadingIS } = useQuery({
    queryKey: ['income-statement', startDate, endDate],
    queryFn: () => reportsApi.incomeStatement({ startDate, endDate }),
    enabled: activeReport === 'income-statement',
  });

  const { data: balanceSheet, isLoading: isLoadingBS } = useQuery({
    queryKey: ['balance-sheet', asOfDate],
    queryFn: () => reportsApi.balanceSheet({ asOfDate }),
    enabled: activeReport === 'balance-sheet',
  });

  const { data: cashFlow, isLoading: isLoadingCF } = useQuery({
    queryKey: ['cash-flow', startDate, endDate],
    queryFn: () => reportsApi.cashFlow({ startDate, endDate }),
    enabled: activeReport === 'cash-flow',
  });

  const { data: agingData } = useQuery({
    queryKey: ['aging-receivables'],
    queryFn: () => reportsApi.aging('receivables'),
    enabled: activeReport === 'aging',
  });

  const REPORTS = [
    { id: 'income-statement', label: 'Income Statement' },
    { id: 'balance-sheet', label: 'Balance Sheet' },
    { id: 'cash-flow', label: 'Cash Flow' },
    { id: 'aging', label: 'Aging Report' },
  ] as const;

  return (
    <div>
      <Header
        title="Financial Reports"
        subtitle="Income statement, balance sheet, cash flow"
        actions={
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} size="sm">
            Export PDF
          </Button>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Report selector */}
        <div className="flex flex-wrap gap-2">
          {REPORTS.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeReport === r.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Date filters */}
        <Card>
          {activeReport === 'balance-sheet' ? (
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <Input label="As of Date" type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="w-full sm:w-48" />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full sm:w-48" />
              <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full sm:w-48" />
            </div>
          )}
        </Card>

        {/* Income Statement */}
        {activeReport === 'income-statement' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Income Statement</h2>
            <p className="text-sm text-gray-500">
              {dayjs(startDate).format('MMM D, YYYY')} — {dayjs(endDate).format('MMM D, YYYY')}
            </p>

            {isLoadingIS ? (
              <div className="h-64 bg-white rounded-xl border animate-pulse" />
            ) : incomeStatement ? (
              <div className="space-y-4">
                {/* Revenue */}
                <ReportSection title="Revenue" accounts={incomeStatement.revenue?.accounts ?? []} total={incomeStatement.revenue?.total} />

                {/* COGS */}
                <ReportSection title="Cost of Goods Sold" accounts={incomeStatement.costOfGoodsSold?.accounts ?? []} total={incomeStatement.costOfGoodsSold?.total} isDeduction />

                {/* Gross Profit */}
                <SummaryRow label="Gross Profit" value={incomeStatement.grossProfit} bold highlight />

                {/* OpEx */}
                {(incomeStatement.operatingExpenses ?? []).map((group: Record<string, unknown>) => (
                  <ReportSection
                    key={group.category as string}
                    title={group.category as string}
                    accounts={group.accounts as Record<string, unknown>[]}
                    total={group.total}
                    isDeduction
                  />
                ))}

                <SummaryRow label="Total Operating Expenses" value={incomeStatement.totalOperatingExpenses} />
                <SummaryRow label="Operating Income" value={incomeStatement.operatingIncome} bold highlight />
                <SummaryRow label="Net Income" value={incomeStatement.netIncome} bold highlight large />
              </div>
            ) : null}
          </div>
        )}

        {/* Balance Sheet */}
        {activeReport === 'balance-sheet' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Balance Sheet</h2>
            <p className="text-sm text-gray-500">As of {dayjs(asOfDate).format('MMM D, YYYY')}</p>

            {isLoadingBS ? (
              <div className="h-64 bg-white rounded-xl border animate-pulse" />
            ) : balanceSheet ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Assets */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700 uppercase text-xs tracking-wider">Assets</h3>
                  <ReportSection title="Current Assets" accounts={balanceSheet.assets?.current ?? []} total={balanceSheet.assets?.totalCurrent} />
                  <ReportSection title="Non-Current Assets" accounts={balanceSheet.assets?.nonCurrent ?? []} total={balanceSheet.assets?.totalNonCurrent} />
                  <SummaryRow label="Total Assets" value={balanceSheet.assets?.total} bold highlight large />
                </div>

                {/* Right: Liabilities + Equity */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700 uppercase text-xs tracking-wider">Liabilities & Equity</h3>
                  <ReportSection title="Current Liabilities" accounts={balanceSheet.liabilities?.current ?? []} total={balanceSheet.liabilities?.totalCurrent} />
                  <ReportSection title="Non-Current Liabilities" accounts={balanceSheet.liabilities?.nonCurrent ?? []} total={balanceSheet.liabilities?.totalNonCurrent} />
                  <SummaryRow label="Total Liabilities" value={balanceSheet.liabilities?.total} bold />
                  <ReportSection title="Equity" accounts={balanceSheet.equity?.accounts ?? []} total={balanceSheet.equity?.total} />
                  <SummaryRow label="Total Liabilities & Equity" value={balanceSheet.totalLiabilitiesAndEquity} bold highlight large />

                  {balanceSheet.isBalanced ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                      <div className="w-2 h-2 bg-green-500 rounded-full" /> Balance sheet is balanced
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
                      <div className="w-2 h-2 bg-red-500 rounded-full" /> Balance sheet is NOT balanced
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Cash Flow */}
        {activeReport === 'cash-flow' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Cash Flow Statement</h2>
            <p className="text-sm text-gray-500">{dayjs(startDate).format('MMM D, YYYY')} — {dayjs(endDate).format('MMM D, YYYY')}</p>

            {isLoadingCF ? (
              <div className="h-64 bg-white rounded-xl border animate-pulse" />
            ) : cashFlow ? (
              <div className="space-y-4">
                <CashFlowSection title="Operating Activities" items={cashFlow.operating?.items ?? []} total={cashFlow.operating?.total} />
                <CashFlowSection title="Investing Activities" items={cashFlow.investing?.items ?? []} total={cashFlow.investing?.total} />
                <CashFlowSection title="Financing Activities" items={cashFlow.financing?.items ?? []} total={cashFlow.financing?.total} />

                <Card>
                  <div className="space-y-2">
                    <SummaryRow label="Net Change in Cash" value={cashFlow.netChange} bold />
                    <SummaryRow label="Opening Cash Balance" value={cashFlow.openingBalance} />
                    <SummaryRow label="Closing Cash Balance" value={cashFlow.closingBalance} bold highlight large />
                  </div>
                </Card>
              </div>
            ) : null}
          </div>
        )}

        {/* Aging Report */}
        {activeReport === 'aging' && agingData && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Accounts Receivable Aging</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { label: 'Current', data: agingData.buckets?.current },
                { label: '1-30 Days', data: agingData.buckets?.days1_30 },
                { label: '31-60 Days', data: agingData.buckets?.days31_60 },
                { label: '61-90 Days', data: agingData.buckets?.days61_90 },
                { label: '90+ Days', data: agingData.buckets?.over90 },
              ].map(({ label, data }) => (
                <Card key={label} className="text-center py-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-lg font-bold text-gray-900 tabular-nums mt-1">
                    {formatCurrency(data?.amount ?? 0)}
                  </p>
                  <p className="text-xs text-gray-400">{data?.count ?? 0} invoices</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportSection({
  title,
  accounts,
  total,
  isDeduction,
}: {
  title: string;
  accounts: Record<string, unknown>[];
  total: unknown;
  isDeduction?: boolean;
}) {
  if (!accounts.length) return null;
  const totalNum = parseFloat(String(total ?? 0));

  return (
    <Card noPadding>
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 rounded-t-xl">
        <h4 className="font-semibold text-gray-700 text-sm">{title}</h4>
      </div>
      <div className="divide-y divide-gray-50">
        {accounts.map((a) => (
          <div key={a.accountId as string} className="flex items-center justify-between px-4 py-2.5">
            <div>
              <span className="text-xs font-mono text-gray-400 mr-2">{a.accountCode as string}</span>
              <span className="text-sm text-gray-700">{a.accountName as string}</span>
            </div>
            <span className="text-sm tabular-nums font-medium">
              {formatCurrency(a.balance as number)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
        <span className="text-sm font-semibold text-gray-900">Total {title}</span>
        <span className={`text-sm font-bold tabular-nums ${isDeduction ? 'text-red-600' : 'text-gray-900'}`}>
          {isDeduction ? '-' : ''}{formatCurrency(totalNum)}
        </span>
      </div>
    </Card>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  highlight,
  large,
}: {
  label: string;
  value: unknown;
  bold?: boolean;
  highlight?: boolean;
  large?: boolean;
}) {
  const num = parseFloat(String(value ?? 0));
  const isNeg = num < 0;

  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${highlight ? 'bg-brand-50 border border-brand-100' : ''}`}>
      <span className={`${large ? 'text-base' : 'text-sm'} ${bold ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
        {label}
      </span>
      <span className={`${large ? 'text-lg' : 'text-sm'} font-bold tabular-nums ${isNeg ? 'text-red-600' : highlight ? 'text-brand-700' : 'text-gray-900'}`}>
        {formatCurrency(Math.abs(num))}
        {isNeg ? ' (loss)' : ''}
      </span>
    </div>
  );
}

function CashFlowSection({
  title,
  items,
  total,
}: {
  title: string;
  items: Array<{ description: string; amount: unknown }>;
  total: unknown;
}) {
  const totalNum = parseFloat(String(total ?? 0));

  return (
    <Card noPadding>
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 rounded-t-xl">
        <h4 className="font-semibold text-gray-700 text-sm">{title}</h4>
      </div>
      {items.length > 0 ? (
        <div className="divide-y divide-gray-50">
          {items.map((item, i) => {
            const amt = parseFloat(String(item.amount));
            return (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-600">{item.description}</span>
                <span className={`text-sm tabular-nums font-medium ${amt >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {amt >= 0 ? '+' : ''}{formatCurrency(amt)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-3 text-sm text-gray-400">No transactions</div>
      )}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
        <span className="text-sm font-semibold text-gray-900">Net {title}</span>
        <span className={`text-sm font-bold tabular-nums ${totalNum >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {totalNum >= 0 ? '+' : ''}{formatCurrency(totalNum)}
        </span>
      </div>
    </Card>
  );
}
