'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, BookOpen } from 'lucide-react';
import { accountsApi, journalApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Input, Select } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState, TableSkeleton } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';

type ActiveView = 'journal' | 'trial-balance';

export default function LedgerPage() {
  const [view, setView] = useState<ActiveView>('journal');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: journalData, isLoading: journalLoading } = useQuery({
    queryKey: ['journal', { search, startDate, endDate, status: statusFilter, page }],
    queryFn: () => journalApi.list({ search, startDate, endDate, status: statusFilter, page, limit: 20 }),
    enabled: view === 'journal',
  });

  const { data: trialBalance, isLoading: tbLoading } = useQuery({
    queryKey: ['trial-balance', asOfDate],
    queryFn: () => journalApi.trialBalance(asOfDate),
    enabled: view === 'trial-balance',
  });

  const entries = journalData?.entries ?? [];
  const totalPages = journalData?.totalPages ?? 1;

  const tbRows = trialBalance ?? [];
  const totalDebits = tbRows.reduce((s: number, r: Record<string, unknown>) => s + parseFloat(String(r.debitBalance ?? 0)), 0);
  const totalCredits = tbRows.reduce((s: number, r: Record<string, unknown>) => s + parseFloat(String(r.creditBalance ?? 0)), 0);

  return (
    <div>
      <Header title="General Ledger" subtitle="Journal entries and trial balance" />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* View Switcher */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {(['journal', 'trial-balance'] as ActiveView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {v === 'journal' ? 'Journal Entries' : 'Trial Balance'}
            </button>
          ))}
        </div>

        {view === 'journal' ? (
          <>
            {/* Filters */}
            <Card>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Search entries..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    leftAddon={<Search className="h-4 w-4" />}
                  />
                </div>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full sm:w-40" />
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full sm:w-40" />
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[{ value: '', label: 'All' }, { value: 'POSTED', label: 'Posted' }, { value: 'REVERSED', label: 'Reversed' }]}
                  className="w-full sm:w-36"
                />
              </div>
            </Card>

            <Card noPadding>
              <Table>
                <Thead>
                  <tr>
                    <Th>Entry #</Th>
                    <Th>Date</Th>
                    <Th>Description</Th>
                    <Th>Reference</Th>
                    <Th align="right">Debits</Th>
                    <Th align="right">Credits</Th>
                    <Th>Status</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {journalLoading ? (
                    <TableSkeleton rows={8} cols={7} />
                  ) : entries.length === 0 ? (
                    <EmptyState message="No journal entries found" />
                  ) : (
                    entries.map((entry: Record<string, unknown>) => {
                      const lines = (entry.lines as Record<string, unknown>[]) ?? [];
                      const totalDebit = lines.reduce((s, l) => s + parseFloat(String(l.debit ?? 0)), 0);
                      const totalCredit = lines.reduce((s, l) => s + parseFloat(String(l.credit ?? 0)), 0);

                      return (
                        <>
                          <Tr key={`${entry.id}-header`} className="bg-gray-50">
                            <Td>
                              <span className="font-mono text-xs font-semibold text-brand-600">
                                {entry.entryNumber as string}
                              </span>
                            </Td>
                            <Td>{formatDate(entry.date as string)}</Td>
                            <Td>
                              <div>
                                <p className="font-medium">{entry.description as string}</p>
                                <p className="text-xs text-gray-400">{(entry.createdBy as Record<string, string>)?.name}</p>
                              </div>
                            </Td>
                            <Td className="text-gray-500">{(entry.reference as string) ?? '—'}</Td>
                            <Td align="right" className="font-semibold tabular-nums">{formatCurrency(totalDebit)}</Td>
                            <Td align="right" className="font-semibold tabular-nums">{formatCurrency(totalCredit)}</Td>
                            <Td><StatusBadge status={entry.isReversed ? 'REVERSED' : entry.status as string} /></Td>
                          </Tr>
                          {lines.map((line, idx) => (
                            <Tr key={`${entry.id}-line-${idx}`} className="text-xs">
                              <Td />
                              <Td />
                              <Td className="pl-8 text-gray-600">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="h-3 w-3 text-gray-400" />
                                  <span>{(line.account as Record<string, string>)?.code} — {(line.account as Record<string, string>)?.name}</span>
                                  {!!line.description && <span className="text-gray-400">({line.description as string})</span>}
                                </div>
                              </Td>
                              <Td />
                              <Td align="right" className="text-gray-600 tabular-nums">
                                {parseFloat(String(line.debit)) > 0 ? formatCurrency(line.debit as number) : ''}
                              </Td>
                              <Td align="right" className="text-gray-600 tabular-nums">
                                {parseFloat(String(line.credit)) > 0 ? formatCurrency(line.credit as number) : ''}
                              </Td>
                              <Td />
                            </Tr>
                          ))}
                        </>
                      );
                    })
                  )}
                </Tbody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </Card>
          </>
        ) : (
          <>
            <Card>
              <div className="flex items-center gap-3">
                <Input
                  label="As of Date"
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-48"
                />
                {Math.abs(totalDebits - totalCredits) < 0.01 ? (
                  <div className="mt-5 flex items-center gap-2 text-green-600 text-sm font-medium">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    Balanced
                  </div>
                ) : (
                  <div className="mt-5 flex items-center gap-2 text-red-600 text-sm font-medium">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    Out of balance: {formatCurrency(Math.abs(totalDebits - totalCredits))}
                  </div>
                )}
              </div>
            </Card>

            <Card noPadding>
              <Table>
                <Thead>
                  <tr>
                    <Th>Code</Th>
                    <Th>Account Name</Th>
                    <Th>Type</Th>
                    <Th align="right">Debit</Th>
                    <Th align="right">Credit</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {tbLoading ? (
                    <TableSkeleton rows={10} cols={5} />
                  ) : tbRows.length === 0 ? (
                    <EmptyState message="No transactions found" />
                  ) : (
                    <>
                      {tbRows.map((row: Record<string, unknown>) => (
                        <Tr key={row.accountId as string}>
                          <Td><span className="font-mono text-xs font-medium">{row.accountCode as string}</span></Td>
                          <Td className="font-medium">{row.accountName as string}</Td>
                          <Td>
                            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                              {row.accountType as string}
                            </span>
                          </Td>
                          <Td align="right" className="tabular-nums">
                            {parseFloat(String(row.debitBalance)) > 0 ? formatCurrency(row.debitBalance as number) : '—'}
                          </Td>
                          <Td align="right" className="tabular-nums">
                            {parseFloat(String(row.creditBalance)) > 0 ? formatCurrency(row.creditBalance as number) : '—'}
                          </Td>
                        </Tr>
                      ))}
                      {/* Totals Row */}
                      <Tr className="bg-gray-50 font-bold">
                        <Td colSpan={3} className="text-right font-bold text-gray-900">Totals</Td>
                        <Td align="right" className="font-bold tabular-nums">{formatCurrency(totalDebits)}</Td>
                        <Td align="right" className="font-bold tabular-nums">{formatCurrency(totalCredits)}</Td>
                      </Tr>
                    </>
                  )}
                </Tbody>
              </Table>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
