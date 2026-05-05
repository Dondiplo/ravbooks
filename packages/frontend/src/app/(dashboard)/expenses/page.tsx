'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, CheckCircle, XCircle } from 'lucide-react';
import { expensesApi, accountsApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState, TableSkeleton } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'Office Supplies', label: 'Office Supplies' },
  { value: 'Travel', label: 'Travel' },
  { value: 'Utilities', label: 'Utilities' },
  { value: 'Rent', label: 'Rent' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Payroll', label: 'Payroll' },
  { value: 'Professional Services', label: 'Professional Services' },
  { value: 'Other', label: 'Other' },
];

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [form, setForm] = useState({
    description: '',
    amount: '',
    taxRate: '0',
    date: new Date().toISOString().split('T')[0],
    category: '',
    expenseAccountId: '',
    paymentAccountId: '',
    notes: '',
    paymentMethod: 'BANK_TRANSFER',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', { search, status, category, page }],
    queryFn: () => expensesApi.list({ search, status, category, page, limit: 20 }),
  });

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const expenseAccounts = (accountsData ?? []).filter((a: Record<string, string>) => a.type === 'EXPENSE');
  const assetAccounts = (accountsData ?? []).filter((a: Record<string, string>) => a.type === 'ASSET');
  const liabilityAccounts = (accountsData ?? []).filter((a: Record<string, string>) => a.type === 'LIABILITY');
  const paymentAccounts = [...assetAccounts, ...liabilityAccounts];

  const createMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      toast.success('Expense recorded');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      setShowCreate(false);
      setForm({ description: '', amount: '', taxRate: '0', date: new Date().toISOString().split('T')[0], category: '', expenseAccountId: '', paymentAccountId: '', notes: '', paymentMethod: 'BANK_TRANSFER' });
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => expensesApi.approve(id),
    onSuccess: () => {
      toast.success('Expense approved and posted to ledger');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => expensesApi.reject(id, reason),
    onSuccess: () => { toast.success('Expense rejected'); qc.invalidateQueries({ queryKey: ['expenses'] }); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  const expenses = data?.expenses ?? [];
  const totalPages = data?.totalPages ?? 1;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.expenseAccountId || !form.paymentAccountId) {
      toast.error('Please select expense and payment accounts');
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <div>
      <Header
        title="Expenses"
        subtitle="Track and approve business expenses"
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            Record Expense
          </Button>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Filters */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search expenses..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                leftAddon={<Search className="h-4 w-4" />}
              />
            </div>
            <Select
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full sm:w-44"
            />
            <Select
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="w-full sm:w-48"
            />
          </div>
        </Card>

        {/* Table */}
        <Card noPadding>
          <Table>
            <Thead>
              <tr>
                <Th>Expense #</Th>
                <Th>Description</Th>
                <Th>Category</Th>
                <Th>Date</Th>
                <Th align="right">Amount</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {isLoading ? (
                <TableSkeleton rows={8} cols={7} />
              ) : expenses.length === 0 ? (
                <EmptyState message="No expenses found" />
              ) : (
                expenses.map((exp: Record<string, unknown>) => (
                  <Tr key={exp.id as string}>
                    <Td><span className="font-mono text-xs text-brand-600">{exp.expenseNumber as string}</span></Td>
                    <Td>
                      <p className="font-medium max-w-xs truncate">{exp.description as string}</p>
                      {exp.supplier && <p className="text-xs text-gray-400">{(exp.supplier as Record<string, string>).name}</p>}
                    </Td>
                    <Td>{(exp.category as string) ?? '—'}</Td>
                    <Td>{formatDate(exp.date as string)}</Td>
                    <Td align="right" className="font-semibold">{formatCurrency(exp.total as number)}</Td>
                    <Td><StatusBadge status={exp.status as string} /></Td>
                    <Td>
                      {exp.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveMutation.mutate(exp.id as string)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Rejection reason:');
                              if (reason) rejectMutation.mutate({ id: exp.id as string, reason });
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </Td>
                  </Tr>
                ))
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
      </div>

      {/* Create Expense Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Record Expense" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <Textarea
            label="Description *"
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="What was this expense for?"
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Amount *"
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
              leftAddon="$"
              required
            />
            <Input
              label="Tax Rate %"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.taxRate}
              onChange={(e) => setForm(f => ({ ...f, taxRate: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Date *"
              type="date"
              value={form.date}
              onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
              required
            />
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
              options={CATEGORY_OPTIONS.filter(o => o.value)}
            />
          </div>
          <Select
            label="Expense Account (Debit) *"
            value={form.expenseAccountId}
            onChange={(e) => setForm(f => ({ ...f, expenseAccountId: e.target.value }))}
            options={[
              { value: '', label: '— Select account —' },
              ...expenseAccounts.map((a: Record<string, string>) => ({ value: a.id, label: `${a.code} — ${a.name}` })),
            ]}
          />
          <Select
            label="Payment Account (Credit) *"
            value={form.paymentAccountId}
            onChange={(e) => setForm(f => ({ ...f, paymentAccountId: e.target.value }))}
            options={[
              { value: '', label: '— Select account —' },
              ...paymentAccounts.map((a: Record<string, string>) => ({ value: a.id, label: `${a.code} — ${a.name}` })),
            ]}
          />
          <Select
            label="Payment Method"
            value={form.paymentMethod}
            onChange={(e) => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
            options={[
              { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
              { value: 'CASH', label: 'Cash' },
              { value: 'CREDIT_CARD', label: 'Credit Card' },
              { value: 'CHECK', label: 'Check' },
              { value: 'OTHER', label: 'Other' },
            ]}
          />
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Additional notes..."
            rows={2}
          />
          <p className="text-xs text-gray-500">
            Expense will be posted to the ledger upon approval.
          </p>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending} className="flex-1">Record Expense</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
