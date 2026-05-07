import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

interface StatsCardProps {
  title: string;
  value: number | string;
  isCurrency?: boolean;
  change?: number;
  icon: React.ReactNode;
  iconBg?: string;
  subtitle?: string;
}

export function StatsCard({
  title,
  value,
  isCurrency = true,
  change,
  icon,
  iconBg = 'bg-brand-50',
  subtitle,
}: StatsCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">
            {isCurrency ? formatCurrency(value as number) : value}
          </p>
          {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
          {change !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              {isPositive && <TrendingUp className="h-3.5 w-3.5 text-green-500" />}
              {isNegative && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
              {!isPositive && !isNegative && <Minus className="h-3.5 w-3.5 text-gray-400" />}
              <span
                className={cn(
                  'text-xs font-medium',
                  isPositive && 'text-green-600',
                  isNegative && 'text-red-600',
                  !isPositive && !isNegative && 'text-gray-500',
                )}
              >
                {isPositive && '+'}
                {change.toFixed(1)}% vs last month
              </span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', iconBg)}>{icon}</div>
      </div>
    </Card>
  );
}
