'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Search, Send, DollarSign, X } from 'lucide-react';
import { invoicesApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState, TableSkeleton } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function InvoicesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; invoiceId: string; invoiceNumber: string; balanceDue: number } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', { search, status, page }],
    queryFn: () => invoicesApi.list({ search, status, page, limit: 20 }),
  });

  const { data: stats } = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: invoicesApi.stats,
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.send(id),
    onSuccess: () => {
      toast.success('Invoice sent and posted to ledger');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoice-stats'] });
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to send'),
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      invoicesApi.recordPayment(id, data),
    onSuccess: () => {
      toast.success('Payment recorded');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoice-stats'] });
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      setPaymentModal(null);
      setPaymentAmount('');
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to record payment'),
  });

  const handlePayment = () => {
    if (!paymentModal) return;
    paymentMutation.mutate({
      id: paymentModal.invoiceId,
      data: {
        amount: parseFloat(paymentAmount),
        date: paymentDate,
        method: paymentMethod,
      },
    });
  };

  const invoices = data?.invoices ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div>
      <Header
        title="Invoices"
        subtitle="Manage customer invoices"
        actions={
          <Link href="/invoices/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>New Invoice</Button>
          </Link>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats?.total ?? 0, color: 'text-gray-900', isCurrency: false },
            { label: 'Paid', value: stats?.paid ?? 0, color: 'text-green-600', isCurrency: false },
            { label: 'Pending', value: stats?.pending ?? 0, color: 'text-yellow-600', isCurrency: false },
            { label: 'Month Revenue', value: formatCurrency(stats?.monthRevenue ?? 0), color: 'text-brand-600', isCurrency: false },
          ].map((s) => (
            <Card key={s.label} className="text-center py-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search invoice number or customer..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                leftAddon={<Search className="h-4 w-4" />}
              />
            </div>
            <Select
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full sm:w-48"
            />
          </div>
        </Card>

        {/* Table */}
        <Card noPadding>
          <Table>
            <Thead>
              <tr>
                <Th>Invoice #</Th>
                <Th>Customer</Th>
                <Th>Date</Th>
                <Th>Due Date</Th>
                <Th align="right">Total</Th>
                <Th align="right">Balance Due</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {isLoading ? (
                <TableSkeleton rows={8} cols={8} />
              ) : invoices.length === 0 ? (
                <EmptyState message="No invoices found" />
              ) : (
                invoices.map((inv: Record<string, unknown>) => (
                  <Tr
                    key={inv.id as string}
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                  >
                    <Td>
                      <span className="font-mono text-sm font-medium text-brand-600">
                        {inv.invoiceNumber as string}
                      </span>
                    </Td>
                    <Td>
                      <div>
                        <p className="font-medium">{(inv.customer as Record<string, string>)?.name}</p>
                        <p className="text-xs text-gray-400">{(inv.customer as Record<string, string>)?.email}</p>
                      </div>
                    </Td>
                    <Td>{formatDate(inv.date as string)}</Td>
                    <Td>
                      <span className={new Date(inv.dueDate as string) < new Date() && inv.status !== 'PAID' ? 'text-red-600 font-medium' : ''}>
                        {formatDate(inv.dueDate as string)}
                      </span>
                    </Td>
                    <Td align="right">{formatCurrency(inv.total as number)}</Td>
                    <Td align="right">
                      <span className={parseFloat(String(inv.balanceDue)) > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                        {formatCurrency(inv.balanceDue as number)}
                      </span>
                    </Td>
                    <Td><StatusBadge status={inv.status as string} /></Td>
                    <Td>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {inv.status === 'DRAFT' && (
                          <button
                            onClick={() => sendMutation.mutate(inv.id as string)}
                            className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Send invoice"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        {['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status as string) && (
                          <button
                            onClick={() => {
                              setPaymentModal({
                                open: true,
                                invoiceId: inv.id as string,
                                invoiceNumber: inv.invoiceNumber as string,
                                balanceDue: parseFloat(String(inv.balanceDue)),
                              });
                              setPaymentAmount(String(inv.balanceDue));
                            }}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Record payment"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>

          {/* Pagination */}
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

      {/* Payment Modal */}
      <Modal
        isOpen={!!paymentModal}
        onClose={() => setPaymentModal(null)}
        title={`Record Payment — ${paymentModal?.invoiceNumber}`}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Payment Amount"
            type="number"
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            hint={`Balance due: ${formatCurrency(paymentModal?.balanceDue ?? 0)}`}
            leftAddon="$"
          />
          <Input
            label="Payment Date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={[
              { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
              { value: 'CASH', label: 'Cash' },
              { value: 'CHECK', label: 'Check' },
              { value: 'CREDIT_CARD', label: 'Credit Card' },
              { value: 'OTHER', label: 'Other' },
            ]}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setPaymentModal(null)} className="flex-1">Cancel</Button>
            <Button
              onClick={handlePayment}
              isLoading={paymentMutation.isPending}
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
              className="flex-1"
            >
              Record Payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
