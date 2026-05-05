'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, AlertTriangle, Package, TrendingUp } from 'lucide-react';
import { inventoryApi, accountsApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState, TableSkeleton } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import Decimal from 'decimal.js';

export default function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showAdjust, setShowAdjust] = useState<{ open: boolean; item?: Record<string, unknown> } | null>(null);

  const [createForm, setCreateForm] = useState({
    sku: '', name: '', description: '', category: '',
    unit: 'unit', costPrice: '', sellingPrice: '', reorderLevel: '0',
    assetAccountId: '', cogsAccountId: '', revenueAccountId: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    type: 'PURCHASE',
    quantity: '',
    unitCost: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', { search, lowStock, page }],
    queryFn: () => inventoryApi.list({ search, lowStock, page, limit: 20 }),
  });

  const { data: valuation } = useQuery({
    queryKey: ['inventory-valuation'],
    queryFn: inventoryApi.valuation,
  });

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.list,
  });

  const accounts = accountsData ?? [];
  const assetAccounts = accounts.filter((a: Record<string, string>) => a.type === 'ASSET');
  const expenseAccounts = accounts.filter((a: Record<string, string>) => a.type === 'EXPENSE');
  const revenueAccounts = accounts.filter((a: Record<string, string>) => a.type === 'REVENUE');

  const createMutation = useMutation({
    mutationFn: inventoryApi.create,
    onSuccess: () => {
      toast.success('Item created');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      setShowCreate(false);
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  const adjustMutation = useMutation({
    mutationFn: inventoryApi.adjustStock,
    onSuccess: () => {
      toast.success('Stock adjusted');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-valuation'] });
      setShowAdjust(null);
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const lowStockCount = items.filter((i: Record<string, unknown>) => i.isLowStock).length;

  const handleAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAdjust?.item) return;
    adjustMutation.mutate({
      inventoryItemId: showAdjust.item.id,
      type: adjustForm.type,
      quantity: parseFloat(adjustForm.quantity),
      unitCost: parseFloat(adjustForm.unitCost) || parseFloat(String(showAdjust.item.costPrice)),
      date: adjustForm.date,
      notes: adjustForm.notes,
    });
  };

  return (
    <div>
      <Header
        title="Inventory"
        subtitle="Stock management and valuation"
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            Add Item
          </Button>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <p className="text-sm text-gray-500">Total Items</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data?.total ?? 0}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Inventory Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
              {formatCurrency(valuation?.totalValue ?? 0)}
            </p>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Low Stock Alerts</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{lowStockCount}</p>
              </div>
              {lowStockCount > 0 && <AlertTriangle className="h-8 w-8 text-yellow-400" />}
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                leftAddon={<Search className="h-4 w-4" />}
              />
            </div>
            <button
              onClick={() => { setLowStock(!lowStock); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                lowStock
                  ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              Low Stock Only
            </button>
          </div>
        </Card>

        {/* Table */}
        <Card noPadding>
          <Table>
            <Thead>
              <tr>
                <Th>SKU</Th>
                <Th>Name</Th>
                <Th>Category</Th>
                <Th align="right">On Hand</Th>
                <Th align="right">Reorder Level</Th>
                <Th align="right">Cost Price</Th>
                <Th align="right">Selling Price</Th>
                <Th align="right">Value</Th>
                <Th>Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {isLoading ? (
                <TableSkeleton rows={8} cols={9} />
              ) : items.length === 0 ? (
                <EmptyState message="No inventory items found" />
              ) : (
                items.map((item: Record<string, unknown>) => {
                  const qty = parseFloat(String(item.quantityOnHand));
                  const reorder = parseFloat(String(item.reorderLevel));
                  const isLow = qty <= reorder;
                  const value = new Decimal(String(item.quantityOnHand)).times(String(item.costPrice));

                  return (
                    <Tr key={item.id as string}>
                      <Td>
                        <span className="font-mono text-xs">{item.sku as string}</span>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          {isLow && <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
                          <span className="font-medium">{item.name as string}</span>
                        </div>
                      </Td>
                      <Td>{(item.category as string) ?? '—'}</Td>
                      <Td align="right">
                        <span className={`font-semibold tabular-nums ${isLow ? 'text-yellow-600' : 'text-gray-900'}`}>
                          {qty.toFixed(2)} {item.unit as string}
                        </span>
                      </Td>
                      <Td align="right" className="text-gray-500">{reorder.toFixed(2)}</Td>
                      <Td align="right">{formatCurrency(item.costPrice as number)}</Td>
                      <Td align="right">{formatCurrency(item.sellingPrice as number)}</Td>
                      <Td align="right" className="font-medium">{formatCurrency(value.toNumber())}</Td>
                      <Td>
                        <button
                          onClick={() => {
                            setShowAdjust({ open: true, item });
                            setAdjustForm({
                              type: 'PURCHASE',
                              quantity: '',
                              unitCost: String(item.costPrice),
                              date: new Date().toISOString().split('T')[0],
                              notes: '',
                            });
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors border border-brand-200"
                        >
                          Adjust
                        </button>
                      </Td>
                    </Tr>
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
      </div>

      {/* Create Item Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Inventory Item" size="lg">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(createForm); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="SKU *" value={createForm.sku} onChange={(e) => setCreateForm(f => ({ ...f, sku: e.target.value }))} required />
            <Input label="Name *" value={createForm.name} onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Category" value={createForm.category} onChange={(e) => setCreateForm(f => ({ ...f, category: e.target.value }))} />
            <Input label="Unit" value={createForm.unit} onChange={(e) => setCreateForm(f => ({ ...f, unit: e.target.value }))} placeholder="unit, kg, box..." />
            <Input label="Reorder Level" type="number" min="0" step="0.001" value={createForm.reorderLevel} onChange={(e) => setCreateForm(f => ({ ...f, reorderLevel: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Cost Price *" type="number" min="0" step="0.01" value={createForm.costPrice} onChange={(e) => setCreateForm(f => ({ ...f, costPrice: e.target.value }))} leftAddon="$" required />
            <Input label="Selling Price *" type="number" min="0" step="0.01" value={createForm.sellingPrice} onChange={(e) => setCreateForm(f => ({ ...f, sellingPrice: e.target.value }))} leftAddon="$" required />
          </div>
          <Select
            label="Inventory Asset Account"
            value={createForm.assetAccountId}
            onChange={(e) => setCreateForm(f => ({ ...f, assetAccountId: e.target.value }))}
            options={[{ value: '', label: '— Select (optional) —' }, ...assetAccounts.map((a: Record<string, string>) => ({ value: a.id, label: `${a.code} — ${a.name}` }))]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="COGS Account"
              value={createForm.cogsAccountId}
              onChange={(e) => setCreateForm(f => ({ ...f, cogsAccountId: e.target.value }))}
              options={[{ value: '', label: '— Optional —' }, ...expenseAccounts.map((a: Record<string, string>) => ({ value: a.id, label: `${a.code} — ${a.name}` }))]}
            />
            <Select
              label="Revenue Account"
              value={createForm.revenueAccountId}
              onChange={(e) => setCreateForm(f => ({ ...f, revenueAccountId: e.target.value }))}
              options={[{ value: '', label: '— Optional —' }, ...revenueAccounts.map((a: Record<string, string>) => ({ value: a.id, label: `${a.code} — ${a.name}` }))]}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending} className="flex-1">Add Item</Button>
          </div>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={!!showAdjust?.open}
        onClose={() => setShowAdjust(null)}
        title={`Adjust Stock — ${showAdjust?.item?.name}`}
        size="sm"
      >
        <form onSubmit={handleAdjust} className="space-y-4">
          <p className="text-sm text-gray-500">
            Current: <strong>{parseFloat(String(showAdjust?.item?.quantityOnHand ?? 0)).toFixed(3)} {showAdjust?.item?.unit as string}</strong>
          </p>
          <Select
            label="Movement Type"
            value={adjustForm.type}
            onChange={(e) => setAdjustForm(f => ({ ...f, type: e.target.value }))}
            options={[
              { value: 'PURCHASE', label: 'Purchase (Stock In)' },
              { value: 'SALE', label: 'Sale (Stock Out)' },
              { value: 'ADJUSTMENT_IN', label: 'Adjustment In' },
              { value: 'ADJUSTMENT_OUT', label: 'Adjustment Out' },
              { value: 'RETURN_IN', label: 'Return In' },
              { value: 'WRITE_OFF', label: 'Write Off' },
            ]}
          />
          <Input label="Quantity *" type="number" min="0.001" step="0.001" value={adjustForm.quantity} onChange={(e) => setAdjustForm(f => ({ ...f, quantity: e.target.value }))} required />
          <Input label="Unit Cost" type="number" min="0" step="0.01" value={adjustForm.unitCost} onChange={(e) => setAdjustForm(f => ({ ...f, unitCost: e.target.value }))} leftAddon="$" />
          <Input label="Date" type="date" value={adjustForm.date} onChange={(e) => setAdjustForm(f => ({ ...f, date: e.target.value }))} />
          <Textarea label="Notes" value={adjustForm.notes} onChange={(e) => setAdjustForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAdjust(null)} className="flex-1">Cancel</Button>
            <Button type="submit" isLoading={adjustMutation.isPending} className="flex-1">Record Movement</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
