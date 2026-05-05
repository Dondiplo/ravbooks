import React from 'react';
import { cn, getStatusColor } from '@/lib/utils';

interface BadgeProps {
  status?: string;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ status, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        status ? getStatusColor(status) : 'bg-gray-100 text-gray-800',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    PAID: 'Paid',
    SENT: 'Sent',
    DRAFT: 'Draft',
    OVERDUE: 'Overdue',
    PARTIALLY_PAID: 'Partial',
    CANCELLED: 'Cancelled',
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    POSTED: 'Posted',
    REVERSED: 'Reversed',
  };
  return <Badge status={status}>{labels[status] ?? status}</Badge>;
}
