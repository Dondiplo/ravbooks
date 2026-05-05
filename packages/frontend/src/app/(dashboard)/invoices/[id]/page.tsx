'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, DollarSign, XCircle, Printer } from 'lucide-react';
import { invoicesApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.get(id),
  });

  const sendMutation = useMutation({
    mutationFn: () => invoicesApi.send(id),
    onSuccess: () => {
      toast.success('Invoice sent and posted to ledger');
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => invoicesApi.cancel(id, 'Cancelled by user'),
    onSuccess: () => {
      toast.success('Invoice cancelled');
      qc.invalidateQueries({ queryKey: ['invoice', id] });
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  if (isLoading) {
    return (
      <div>
        <Header title="Invoice" />
        <div className="p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border h-32 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  const canSend = invoice.status === 'DRAFT';
  const canCancel = !['PAID', 'CANCELLED'].includes(invoice.status);

  return (
    <div>
      <Header
        title={`Invoice ${invoice.invoiceNumber}`}
        subtitle={invoice.customer?.name}
        actions={
          <div className="flex gap-2">
            <Link href="/invoices">
              <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
            </Link>
            {canSend && (
              <Button
                leftIcon={<Send className="h-4 w-4" />}
                onClick={() => sendMutation.mutate()}
                isLoading={sendMutation.isPending}
              >
                Send & Post
              </Button>
            )}
            {canCancel && (
              <Button
                variant="danger"
                leftIcon={<XCircle className="h-4 w-4" />}
                onClick={() => {
                  if (confirm('Cancel this invoice?')) cancelMutation.mutate();
                }}
                isLoading={cancelMutation.isPending}
              >
                Cancel
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6 max-w-4xl space-y-6">
        {/* Header card */}
        <Card>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
              <div className="mt-1"><StatusBadge status={invoice.status} /></div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Invoice Date</p>
              <p className="mt-1 text-sm font-medium">{formatDate(invoice.date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Due Date</p>
              <p className={`mt-1 text-sm font-medium ${new Date(invoice.dueDate) < new Date() && invoice.status !== 'PAID' ? 'text-red-600' : ''}`}>
                {formatDate(invoice.dueDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Terms</p>
              <p className="mt-1 text-sm font-medium">{invoice.terms ?? '—'}</p>
            </div>
          </div>
        </Card>

        {/* Customer */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-3">Bill To</h3>
          <p className="font-medium">{invoice.customer?.name}</p>
          {invoice.customer?.email && <p className="text-sm text-gray-500">{invoice.customer.email}</p>}
          {invoice.customer?.phone && <p className="text-sm text-gray-500">{invoice.customer.phone}</p>}
          {invoice.customer?.address && <p className="text-sm text-gray-500">{invoice.customer.address}</p>}
        </Card>

        {/* Line Items */}
        <Card noPadding>
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Line Items</h3>
          </div>
          <Table>
            <Thead>
              <tr>
                <Th>Description</Th>
                <Th align="right">Qty</Th>
                <Th align="right">Unit Price</Th>
                <Th align="right">Disc%</Th>
                <Th align="right">Tax%</Th>
                <Th align="right">Amount</Th>
              </tr>
            </Thead>
            <Tbody>
              {invoice.items?.map((item: Record<string, unknown>) => (
                <Tr key={item.id as string}>
                  <Td>{item.description as string}</Td>
                  <Td align="right">{parseFloat(String(item.quantity)).toFixed(2)}</Td>
                  <Td align="right">{formatCurrency(item.unitPrice as number)}</Td>
                  <Td align="right">{parseFloat(String(item.discountPct)).toFixed(1)}%</Td>
                  <Td align="right">{parseFloat(String(item.taxRate)).toFixed(1)}%</Td>
                  <Td align="right" className="font-semibold">{formatCurrency(item.amount as number)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          {/* Totals */}
          <div className="px-6 py-4 border-t border-gray-100">
            <div className="ml-auto max-w-xs space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {parseFloat(String(invoice.taxAmount)) > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax</span>
                  <span className="tabular-nums">{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600 font-medium">
                <span>Amount Paid</span>
                <span className="tabular-nums">{formatCurrency(invoice.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-red-600 pt-1 border-t border-gray-200">
                <span>Balance Due</span>
                <span className="tabular-nums">{formatCurrency(invoice.balanceDue)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Payments */}
        {invoice.payments?.length > 0 && (
          <Card noPadding>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Payment History</h3>
            </div>
            <Table>
              <Thead>
                <tr>
                  <Th>Payment #</Th>
                  <Th>Date</Th>
                  <Th>Method</Th>
                  <Th>Reference</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </Thead>
              <Tbody>
                {invoice.payments.map((p: Record<string, unknown>) => (
                  <Tr key={p.id as string}>
                    <Td><span className="font-mono text-xs">{p.paymentNumber as string}</span></Td>
                    <Td>{formatDate(p.date as string)}</Td>
                    <Td>{String(p.method).replace('_', ' ')}</Td>
                    <Td>{(p.reference as string) ?? '—'}</Td>
                    <Td align="right" className="font-semibold text-green-600">{formatCurrency(p.amount as number)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>
        )}

        {invoice.notes && (
          <Card>
            <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
