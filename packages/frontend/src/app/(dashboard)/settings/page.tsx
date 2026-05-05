'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const changePasswordMutation = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    changePasswordMutation.mutate();
  };

  return (
    <div>
      <Header title="Settings" subtitle="Account and system settings" />

      <div className="p-6 space-y-6 max-w-2xl">
        {/* Profile */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Your Profile</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-brand-500 rounded-full flex items-center justify-center text-xl font-bold text-white">
              {user?.name[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className={`inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user?.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                user?.role === 'ACCOUNTANT' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-700'
              }`}>
                {user?.role}
              </span>
            </div>
          </div>
        </Card>

        {/* Change Password */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Change Password</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              hint="Minimum 8 characters"
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : ''}
              required
            />
            <Button
              type="submit"
              isLoading={changePasswordMutation.isPending}
              disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
            >
              Change Password
            </Button>
          </form>
        </Card>

        {/* System Info */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">System Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Application</span>
              <span className="font-medium">AccountIQ v1.0.0</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Accounting Method</span>
              <span className="font-medium">Double-Entry (Accrual)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Inventory Costing</span>
              <span className="font-medium">FIFO</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Default Currency</span>
              <span className="font-medium">USD</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
