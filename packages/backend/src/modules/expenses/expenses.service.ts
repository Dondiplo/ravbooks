import Decimal from 'decimal.js';
import { ExpenseStatus, PaymentMethod } from '@prisma/client';
import { prisma } from '../../config/database';
import { AccountingEngine } from '../../core/accounting/engine';
import { AppError } from '../../middleware/error.middleware';
import { generateExpenseNumber } from '../../utils/sequence';

const engine = new AccountingEngine(prisma);

interface CreateExpenseInput {
  supplierId?: string;
  expenseAccountId: string;
  paymentAccountId: string;
  date: string;
  amount: number;
  taxRate?: number;
  description: string;
  category?: string;
  receiptUrl?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  createdById: string;
}

export class ExpensesService {
  async findAll(filters: {
    status?: ExpenseStatus;
    category?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, category, startDate, endDate, search, page = 1, limit = 20 } = filters;
    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { expenseNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: [{ date: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    return { expenses, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdBy: { select: { name: true, email: true } },
      },
    });
    if (!expense) throw new AppError(404, 'Expense not found');
    return expense;
  }

  async create(input: CreateExpenseInput) {
    const expenseNumber = await generateExpenseNumber(prisma);
    const amount = new Decimal(input.amount);
    const taxRate = new Decimal(input.taxRate ?? 0).div(100);
    const taxAmount = amount.times(taxRate);
    const total = amount.plus(taxAmount);

    return prisma.expense.create({
      data: {
        expenseNumber,
        supplierId: input.supplierId,
        expenseAccountId: input.expenseAccountId,
        paymentAccountId: input.paymentAccountId,
        date: new Date(input.date),
        amount: amount.toDecimalPlaces(2),
        taxAmount: taxAmount.toDecimalPlaces(2),
        total: total.toDecimalPlaces(2),
        description: input.description,
        category: input.category,
        status: ExpenseStatus.PENDING,
        receiptUrl: input.receiptUrl,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
        createdById: input.createdById,
      },
    });
  }

  async approve(id: string, userId: string) {
    const expense = await this.findById(id);
    if (expense.status !== ExpenseStatus.PENDING) {
      throw new AppError(400, 'Only pending expenses can be approved');
    }

    const expenseAccount = await prisma.account.findUnique({
      where: { id: expense.expenseAccountId },
    });
    const paymentAccount = await prisma.account.findUnique({
      where: { id: expense.paymentAccountId },
    });

    if (!expenseAccount || !paymentAccount) {
      throw new AppError(500, 'Expense or payment account not found');
    }

    const total = new Decimal(expense.total.toString());

    // Dr. Expense Account / Cr. Cash or AP
    const journalEntry = await engine.postJournalEntry({
      date: expense.date,
      description: `Expense: ${expense.description}`,
      reference: expense.expenseNumber,
      sourceType: 'expense',
      sourceId: expense.id,
      lines: [
        { accountId: expenseAccount.id, debit: total, credit: new Decimal(0) },
        { accountId: paymentAccount.id, debit: new Decimal(0), credit: total },
      ],
      createdById: userId,
    });

    return prisma.expense.update({
      where: { id },
      data: { status: ExpenseStatus.APPROVED, journalEntryId: journalEntry.id },
    });
  }

  async reject(id: string, reason: string) {
    const expense = await this.findById(id);
    if (expense.status !== ExpenseStatus.PENDING) {
      throw new AppError(400, 'Only pending expenses can be rejected');
    }
    return prisma.expense.update({
      where: { id },
      data: { status: ExpenseStatus.REJECTED, notes: reason },
    });
  }

  async getCategoryStats(startDate?: string, endDate?: string) {
    const where: Record<string, unknown> = { status: ExpenseStatus.APPROVED };
    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    const stats = await prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: { total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
    });

    return stats.map((s) => ({
      category: s.category ?? 'Uncategorized',
      total: s._sum.total ?? 0,
      count: s._count,
    }));
  }
}
