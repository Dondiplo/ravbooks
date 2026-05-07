import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import dayjs from 'dayjs';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = 'USD') {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: string | Date, format = 'MMM D, YYYY') {
  return dayjs(date).format(format);
}

export function formatPercent(value: number, decimals = 1) {
  return `${value.toFixed(decimals)}%`;
}

export function getStatusColor(status: string) {
  const map: Record<string, string> = {
    PAID: 'bg-green-100 text-green-800',
    SENT: 'bg-blue-100 text-blue-800',
    DRAFT: 'bg-gray-100 text-gray-800',
    OVERDUE: 'bg-red-100 text-red-800',
    PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
    CANCELLED: 'bg-gray-100 text-gray-500',
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    POSTED: 'bg-green-100 text-green-800',
    REVERSED: 'bg-purple-100 text-purple-800',
  };
  return map[status] ?? 'bg-gray-100 text-gray-800';
}
