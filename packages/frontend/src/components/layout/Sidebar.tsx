'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Package,
  BookOpen,
  BarChart3,
  DollarSign,
  Users,
  Building2,
  Truck,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'General Ledger', href: '/ledger', icon: BookOpen },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Cash Flow', href: '/cashflow', icon: DollarSign },
  { name: 'Customers', href: '/customers', icon: Building2 },
  { name: 'Suppliers', href: '/suppliers', icon: Truck },
  { name: 'Users', href: '/users', icon: Users, adminOnly: true },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useUI();

  const filteredNav = navigation.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      className={cn(
        'flex flex-col w-64 bg-gray-900 text-white',
        // Mobile: fixed drawer that slides in/out
        'fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop: static, always visible, no transform
        'lg:relative lg:translate-x-0 lg:min-h-screen lg:z-auto',
      )}
    >
      {/* Close button — mobile only */}
      <button
        onClick={() => setSidebarOpen(false)}
        className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors lg:hidden"
        aria-label="Close menu"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
          <DollarSign className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold">AccountIQ</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white',
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="px-3 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-sm font-semibold">
            {user?.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 mt-1 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
