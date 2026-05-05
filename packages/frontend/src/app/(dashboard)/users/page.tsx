'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Shield, Clock } from 'lucide-react';
import { usersApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Table, Thead, Tbody, Th, Td, Tr, EmptyState, TableSkeleton } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

type TabType = 'users' | 'audit';

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-800',
  ACCOUNTANT: 'bg-blue-100 text-blue-800',
  STAFF: 'bg-gray-100 text-gray-700',
};

export default function UsersPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<TabType>('users');
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'STAFF' });

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => usersApi.list({ page, limit: 20 }),
    enabled: tab === 'users',
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['audit-logs', auditPage],
    queryFn: () => usersApi.auditLogs({ page: auditPage, limit: 30 }),
    enabled: tab === 'audit',
  });

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      toast.success('User created');
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowCreate(false);
      setForm({ name: '', email: '', password: '', role: 'STAFF' });
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.update(id, { isActive }),
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries({ queryKey: ['users'] }); },
  });

  const users = usersData?.users ?? [];
  const totalPages = usersData?.totalPages ?? 1;
  const auditLogs = auditData?.logs ?? [];
  const auditTotalPages = auditData?.totalPages ?? 1;

  return (
    <div>
      <Header
        title="User Management"
        subtitle="Manage users and audit logs"
        actions={
          isAdmin && (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
              Add User
            </Button>
          )
        }
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Tab Switcher */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {(['users', 'audit'] as TabType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t === 'users' ? <Shield className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              {t === 'users' ? 'Users' : 'Audit Logs'}
            </button>
          ))}
        </div>

        {tab === 'users' ? (
          <Card noPadding>
            <Table>
              <Thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th>Last Login</Th>
                  {isAdmin && <Th>Actions</Th>}
                </tr>
              </Thead>
              <Tbody>
                {isLoading ? (
                  <TableSkeleton rows={6} cols={6} />
                ) : users.length === 0 ? (
                  <EmptyState message="No users found" />
                ) : (
                  users.map((user: Record<string, unknown>) => (
                    <Tr key={user.id as string}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-sm font-semibold text-brand-700">
                            {(user.name as string)[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium">{user.name as string}</span>
                        </div>
                      </Td>
                      <Td className="text-gray-500">{user.email as string}</Td>
                      <Td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role as string]}`}>
                          {user.role as string}
                        </span>
                      </Td>
                      <Td>
                        <Badge status={user.isActive ? 'APPROVED' : 'REJECTED'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </Td>
                      <Td className="text-gray-500">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt as string) : 'Never'}
                      </Td>
                      {isAdmin && (
                        <Td>
                          <button
                            onClick={() => toggleActiveMutation.mutate({ id: user.id as string, isActive: !user.isActive })}
                            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                              user.isActive
                                ? 'text-red-600 hover:bg-red-50 border border-red-200'
                                : 'text-green-600 hover:bg-green-50 border border-green-200'
                            }`}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </Td>
                      )}
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
        ) : (
          <Card noPadding>
            <Table>
              <Thead>
                <tr>
                  <Th>Time</Th>
                  <Th>User</Th>
                  <Th>Action</Th>
                  <Th>Entity</Th>
                  <Th>IP Address</Th>
                </tr>
              </Thead>
              <Tbody>
                {auditLoading ? (
                  <TableSkeleton rows={10} cols={5} />
                ) : auditLogs.length === 0 ? (
                  <EmptyState message="No audit logs" />
                ) : (
                  auditLogs.map((log: Record<string, unknown>) => (
                    <Tr key={log.id as string}>
                      <Td className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(log.createdAt as string, 'MMM D, YYYY HH:mm')}
                      </Td>
                      <Td>
                        <p className="font-medium text-sm">{(log.user as Record<string, string>)?.name}</p>
                        <p className="text-xs text-gray-400">{(log.user as Record<string, string>)?.email}</p>
                      </Td>
                      <Td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.action === 'LOGIN' ? 'bg-blue-100 text-blue-700' :
                          log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                          log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {log.action as string}
                        </span>
                      </Td>
                      <Td className="text-gray-500">{log.entity as string}</Td>
                      <Td className="text-xs text-gray-400 font-mono">{(log.ipAddress as string) ?? '—'}</Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
            {auditTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">Page {auditPage} of {auditTotalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditPage === 1}>Prev</Button>
                  <Button variant="outline" size="sm" onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))} disabled={auditPage === auditTotalPages}>Next</Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Create User Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add User" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
          <Input label="Full Name *" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="Email *" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required />
          <Input label="Password *" type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} required hint="Minimum 8 characters" />
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
            options={[
              { value: 'STAFF', label: 'Staff — basic access' },
              { value: 'ACCOUNTANT', label: 'Accountant — can post entries' },
              { value: 'ADMIN', label: 'Admin — full access' },
            ]}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending} className="flex-1">Create User</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
