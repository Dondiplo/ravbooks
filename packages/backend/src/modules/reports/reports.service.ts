import { InvoiceStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { ReportsEngine } from '../../core/accounting/reports.engine';
import { AppError } from '../../middleware/error.middleware';
import dayjs from 'dayjs';

const reportsEngine = new ReportsEngine(prisma);

export class ReportsService {
  async getIncomeStatement(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError(400, 'Invalid date range');
    }
    return reportsEngine.getIncomeStatement(start, end);
  }

  async getBalanceSheet(asOfDate: string) {
    const date = new Date(asOfDate);
    if (isNaN(date.getTime())) throw new AppError(400, 'Invalid date');
    return reportsEngine.getBalanceSheet(date);
  }

  async getCashFlowStatement(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError(400, 'Invalid date range');
    }
    return reportsEngine.getCashFlowStatement(start, end);
  }

  async getTrialBalance(asOfDate: string) {
    const date = new Date(asOfDate);
    if (isNaN(date.getTime())) throw new AppError(400, 'Invalid date');
    return reportsEngine.getTrialBalance(date);
  }

  async getAgingReport(type: 'receivables' | 'payables') {
    const today = dayjs();
    const invoices = await prisma.invoice.findMany({
      where: type === 'receivables'
        ? { status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] as InvoiceStatus[] } }
        : undefined,
      include: { customer: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
    });

    const buckets = {
      current: { count: 0, amount: 0 },
      days1_30: { count: 0, amount: 0 },
      days31_60: { count: 0, amount: 0 },
      days61_90: { count: 0, amount: 0 },
      over90: { count: 0, amount: 0 },
    };

    for (const inv of invoices) {
      const daysOverdue = today.diff(dayjs(inv.dueDate), 'day');
      const balance = Number(inv.balanceDue);

      if (daysOverdue <= 0) {
        buckets.current.count++;
        buckets.current.amount += balance;
      } else if (daysOverdue <= 30) {
        buckets.days1_30.count++;
        buckets.days1_30.amount += balance;
      } else if (daysOverdue <= 60) {
        buckets.days31_60.count++;
        buckets.days31_60.amount += balance;
      } else if (daysOverdue <= 90) {
        buckets.days61_90.count++;
        buckets.days61_90.amount += balance;
      } else {
        buckets.over90.count++;
        buckets.over90.amount += balance;
      }
    }

    return { type, buckets, invoices };
  }

  async getDashboardMetrics() {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      monthRevenue,
      monthExpenses,
      cashBalance,
      receivables,
      overdueInvoices,
      lowStockCount,
      monthlyData,
    ] = await Promise.all([
      // Month revenue
      prisma.invoice.aggregate({
        where: { status: { in: ['PAID', 'PARTIALLY_PAID'] }, date: { gte: firstOfMonth } },
        _sum: { amountPaid: true },
      }),
      // Month expenses
      prisma.expense.aggregate({
        where: { status: 'APPROVED', date: { gte: firstOfMonth } },
        _sum: { total: true },
      }),
      // Cash balance from accounts
      prisma.account.findMany({
        where: { subtype: { in: ['CASH', 'BANK'] }, isActive: true },
      }),
      // Total receivables
      prisma.invoice.aggregate({
        where: { status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] } },
        _sum: { balanceDue: true },
      }),
      // Overdue invoices count
      prisma.invoice.count({ where: { status: 'OVERDUE' } }),
      // Low stock count
      prisma.inventoryItem.count({
        where: { isActive: true, quantityOnHand: { lte: prisma.inventoryItem.fields.reorderLevel } },
      }),
      // Monthly revenue for chart (last 6 months)
      this.getMonthlyRevenue(6),
    ]);

    const totalRevenue = Number(monthRevenue._sum.amountPaid ?? 0);
    const totalExpenses = Number(monthExpenses._sum.total ?? 0);

    return {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      netProfitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
      totalReceivables: Number(receivables._sum.balanceDue ?? 0),
      overdueInvoices,
      lowStockItems: lowStockCount,
      monthlyData,
    };
  }

  private async getMonthlyRevenue(months: number) {
    const result = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = dayjs().subtract(i, 'month');
      const start = d.startOf('month').toDate();
      const end = d.endOf('month').toDate();

      const rev = await prisma.invoice.aggregate({
        where: { status: { in: ['PAID', 'PARTIALLY_PAID'] }, date: { gte: start, lte: end } },
        _sum: { amountPaid: true },
      });
      const exp = await prisma.expense.aggregate({
        where: { status: 'APPROVED', date: { gte: start, lte: end } },
        _sum: { total: true },
      });

      result.push({
        month: d.format('MMM YY'),
        revenue: Number(rev._sum.amountPaid ?? 0),
        expenses: Number(exp._sum.total ?? 0),
      });
    }
    return result;
  }
}
