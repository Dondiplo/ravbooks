import { AccountType, NormalBalance } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { AccountingEngine } from '../../core/accounting/engine';
import { ACCOUNT_NORMAL_BALANCE } from '../../types/accounting.types';

const engine = new AccountingEngine(prisma);

export class AccountsService {
  async findAll(type?: AccountType, includeInactive = false) {
    return prisma.account.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: { children: { where: { isActive: true }, orderBy: { code: 'asc' } } },
      orderBy: { code: 'asc' },
    });
  }

  async findById(id: string) {
    const account = await prisma.account.findUnique({
      where: { id },
      include: { parent: true, children: true },
    });
    if (!account) throw new AppError(404, 'Account not found');
    return account;
  }

  async create(data: {
    code: string;
    name: string;
    type: AccountType;
    subtype?: string;
    description?: string;
    parentId?: string;
  }) {
    const exists = await prisma.account.findUnique({ where: { code: data.code } });
    if (exists) throw new AppError(409, `Account code ${data.code} already exists`);

    const normalBalance = ACCOUNT_NORMAL_BALANCE[data.type];

    return prisma.account.create({
      data: {
        ...data,
        normalBalance,
      },
    });
  }

  async update(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) throw new AppError(404, 'Account not found');

    return prisma.account.update({ where: { id }, data });
  }

  async getBalance(id: string, asOfDate?: string) {
    const date = asOfDate ? new Date(asOfDate) : new Date();
    return engine.getAccountBalance(id, date);
  }

  async getLedger(
    accountId: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 50,
  ) {
    const where: Record<string, unknown> = {
      accountId,
      journalEntry: { status: 'POSTED' },
    };

    if (startDate || endDate) {
      (where.journalEntry as Record<string, unknown>).date = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    const skip = (page - 1) * limit;

    const [lines, total] = await Promise.all([
      prisma.journalEntryLine.findMany({
        where,
        include: { journalEntry: true, account: true },
        orderBy: [{ journalEntry: { date: 'asc' } }, { journalEntry: { entryNumber: 'asc' } }],
        skip,
        take: limit,
      }),
      prisma.journalEntryLine.count({ where }),
    ]);

    return { lines, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
