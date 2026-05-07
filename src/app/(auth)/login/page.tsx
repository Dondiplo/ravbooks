'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DollarSign, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { DEMO_MODE } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Login failed';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg">
            <DollarSign className="h-7 w-7 text-white" />
          </div>
          <span className="text-3xl font-bold text-white">AccountIQ</span>
        </div>

        {DEMO_MODE && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800">
            <p className="font-semibold flex items-center gap-1.5 mb-2">
              <Zap className="h-4 w-4" /> Live demo — no backend required
            </p>
            <p className="text-amber-700 mb-3">Click the button below to log in instantly with sample data.</p>
            <Button
              type="button"
              className="w-full bg-amber-500 hover:bg-amber-600"
              onClick={() => {
                setEmail('admin@demo.com');
                setPassword('demo');
              }}
            >
              Enter demo
            </Button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in</h2>
          <p className="text-gray-500 text-sm mb-6">
            Access your accounting dashboard
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            <Button type="submit" isLoading={isLoading} className="w-full mt-2">
              Sign in
            </Button>
          </form>

          {!DEMO_MODE && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-700 mb-2">Demo credentials:</p>
              <p>Admin: admin@accountiq.com / Admin@123</p>
              <p>Accountant: accountant@accountiq.com / Accountant@123</p>
              <p>Staff: staff@accountiq.com / Staff@123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
