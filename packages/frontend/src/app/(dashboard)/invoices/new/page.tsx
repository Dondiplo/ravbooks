'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { invoicesApi, customersApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
}

const defaultLine: LineItem = {
  description: '',
  quantity: 1,
  unitPrice: 0,
  discountPct: 0,
  taxRate: 0,
};

function calculateLine(item: LineItem) {
  const subtotal = item.quantity * item.unitPrice * (1 - item.discountPct / 100);
  const tax = subtotal * (item.taxRate / 100);
  return { subtotal, tax, total: subtotal + tax };
}

export default function NewInvoicePage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('Net 30');
  const [items, setItems] = useState<LineItem[]>([{ ...defaultLine }]);

  const { data: customersData } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => customersApi.list({ limit: 100 }),
  });

  const customers = customersData?.customers ?? [];
  const customerOptions = [
    { value: '', label: '— Select customer —' },
    ...customers.map((c: Record<string, string>) => ({ value: c.id, label: c.name })),
  ];

  const mutation = useMutation({
    mutationFn: invoicesApi.create,
    onSuccess: (data) => {
      toast.success('Invoice created');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      router.push(`/invoices/${data.id}`);
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create invoice'),
  });

  const updateItem = useCallback((idx: number, field: keyof LineItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }, []);

  const addItem = () => setItems((prev) => [...prev, { ...defaultLine }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const totals = items.reduce(
    (acc, item) => {
      const { subtotal, tax } = calculateLine(item);
      return { subtotal: acc.subtotal + subtotal, tax: acc.tax + tax };
    },
    { subtotal: 0, tax: 0 },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) { toast.error('Please select a customer'); return; }
    if (items.some((i) => !i.description)) { toast.error('All line items need a description'); return; }

    mutation.mutate({
      customerId,
      date,
      dueDate,
      notes,
      terms,
      items: items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPct: item.discountPct,
        taxRate: item.taxRate,
      })),
    });
  };

  return (
    <div>
      <Header
        title="New Invoice"
        subtitle="Create a customer invoice"
        actions={
          <Link href="/invoices">
            <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-4xl">
        {/* Invoice header */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Invoice Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <Select
                label="Customer *"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                options={customerOptions}
              />
            </div>
            <Input
              label="Invoice Date *"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <Input
              label="Due Date *"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Input
              label="Payment Terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="e.g. Net 30"
            />
          </div>
        </Card>

        {/* Line Items */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Line Items</h3>
          <div className="space-y-3">
            {/* Header row */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-1">
              <p className="col-span-4 text-xs font-medium text-gray-500 uppercase">Description</p>
              <p className="col-span-2 text-xs font-medium text-gray-500 uppercase text-right">Qty</p>
              <p className="col-span-2 text-xs font-medium text-gray-500 uppercase text-right">Unit Price</p>
              <p className="col-span-1 text-xs font-medium text-gray-500 uppercase text-right">Disc%</p>
              <p className="col-span-1 text-xs font-medium text-gray-500 uppercase text-right">Tax%</p>
              <p className="col-span-2 text-xs font-medium text-gray-500 uppercase text-right">Amount</p>
            </div>

            {items.map((item, idx) => {
              const { total } = calculateLine(item);
              return (
                <div key={idx} className="flex flex-col gap-2 sm:grid sm:grid-cols-12 sm:gap-3 sm:items-start bg-gray-50 p-3 rounded-xl">
                  <div className="col-span-4">
                    <label className="text-xs font-medium text-gray-500 mb-1 block sm:hidden">Description</label>
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 grid grid-cols-2 gap-2 sm:contents">
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-500 mb-1 block sm:hidden">Quantity</label>
                      <Input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="text-right"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-500 mb-1 block sm:hidden">Unit Price</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="text-right"
                      leftAddon="$"
                    />
                  </div>
                  <div className="col-span-1 grid grid-cols-2 gap-2 sm:contents">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block sm:hidden">Disc %</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={item.discountPct}
                        onChange={(e) => updateItem(idx, 'discountPct', parseFloat(e.target.value) || 0)}
                        className="text-right"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="text-xs font-medium text-gray-500 mb-1 block sm:hidden">Tax %</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={item.taxRate}
                        onChange={(e) => updateItem(idx, 'taxRate', parseFloat(e.target.value) || 0)}
                        className="text-right"
                      />
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center justify-between sm:justify-end gap-2">
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">
                      {formatCurrency(total)}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-red-400 hover:text-red-600 p-1 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-3 flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium py-2"
          >
            <Plus className="h-4 w-4" />
            Add line item
          </button>

          {/* Totals */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="ml-auto max-w-xs space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax</span>
                <span className="tabular-nums">{formatCurrency(totals.tax)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(totals.subtotal + totals.tax)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Notes */}
        <Card>
          <Textarea
            label="Notes / Terms"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment instructions, notes to customer..."
            rows={3}
          />
        </Card>

        <div className="flex gap-3">
          <Button type="submit" isLoading={mutation.isPending} size="lg">
            Create Invoice
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push('/invoices')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
