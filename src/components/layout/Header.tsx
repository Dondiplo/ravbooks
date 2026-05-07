'use client';

import { Bell, Menu } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi, invoicesApi } from '@/lib/api';
import { useUI } from '@/contexts/UIContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { setSidebarOpen } = useUI();

  const { data: alerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const [lowStock, invoiceStats] = await Promise.all([
        inventoryApi.lowStockAlerts(),
        invoicesApi.stats(),
      ]);
      return {
        lowStock: lowStock?.length ?? 0,
        overdueInvoices: invoiceStats?.overdue ?? 0,
      };
    },
    refetchInterval: 60000,
  });

  const totalAlerts = (alerts?.lowStock ?? 0) + (alerts?.overdueInvoices ?? 0);

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors lg:hidden flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate">{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">{subtitle}</p>}
        </div>

        {/* Actions + Bell */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {actions && <div className="flex items-center gap-2">{actions}</div>}
          <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
            <Bell className="h-5 w-5" />
            {totalAlerts > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {totalAlerts > 9 ? '9+' : totalAlerts}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
