'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { customersApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState, TableSkeleton } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', country: '', taxId: '', paymentTerms: '30' });

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { search, page }],
    queryFn: () => customersApi.list({ search, page, limit: 20 }),
  });

  const createMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => { toast.success('Customer added'); qc.invalidateQueries({ queryKey: ['customers'] }); setShowCreate(false); setForm({ name: '', email: '', phone: '', address: '', city: '', country: '', taxId: '', paymentTerms: '30' }); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  const customers = data?.customers ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div>
      <Header
        title="Customers"
        subtitle="Manage customer accounts"
        actions={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>Add Customer</Button>}
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <Card>
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            leftAddon={<Search className="h-4 w-4" />}
          />
        </Card>

        <Card noPadding>
          <Table>
            <Thead>
              <tr>
                <Th>Code</Th>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>City</Th>
                <Th align="right">Payment Terms</Th>
              </tr>
            </Thead>
            <Tbody>
              {isLoading ? (
                <TableSkeleton rows={8} cols={6} />
              ) : customers.length === 0 ? (
                <EmptyState message="No customers found" />
              ) : (
                customers.map((c: Record<string, unknown>) => (
                  <Tr key={c.id as string}>
                    <Td><span className="font-mono text-xs">{c.code as string}</span></Td>
                    <Td className="font-medium">{c.name as string}</Td>
                    <Td className="text-gray-500">{(c.email as string) ?? '—'}</Td>
                    <Td className="text-gray-500">{(c.phone as string) ?? '—'}</Td>
                    <Td className="text-gray-500">{(c.city as string) ?? '—'}</Td>
                    <Td align="right">{c.paymentTerms as number} days</Td>
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

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Customer" size="md">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
          <Input label="Name *" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <Input label="Address" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="City" value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} />
            <Input label="Country" value={form.country} onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))} />
            <Input label="Payment Terms (days)" type="number" value={form.paymentTerms} onChange={(e) => setForm(f => ({ ...f, paymentTerms: e.target.value }))} />
          </div>
          <Input label="Tax ID / VAT" value={form.taxId} onChange={(e) => setForm(f => ({ ...f, taxId: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending} className="flex-1">Add Customer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
