import { prisma } from '../../config/database';
import { AccountingEngine } from '../../core/accounting/engine';
import { AppError } from '../../middleware/error.middleware';
import { JournalEntryInput } from '../../types/accounting.types';

const engine = new AccountingEngine(prisma);

export class JournalService {
  async findAll(filters: {
    startDate?: string;
    endDate?: string;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { startDate, endDate, search, status, page = 1, limit = 20 } = filters;

    const where: Record<string, unknown> = {};
    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { entryNumber: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;

    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        include: {
          lines: { include: { account: true }, orderBy: { sortOrder: 'asc' } },
          createdBy: { select: { name: true, email: true } },
        },
        orderBy: [{ date: 'desc' }, { entryNumber: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.journalEntry.count({ where }),
    ]);

    return { entries, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const entry = await prisma.journalEntry.findUnique({
      where: { id },
      include: {
        lines: { include: { account: true }, orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { name: true, email: true } },
      },
    });
    if (!entry) throw new AppError(404, 'Journal entry not found');
    return entry;
  }

  async post(input: JournalEntryInput) {
    return engine.postJournalEntry(input);
  }

  async reverse(id: string, reversalDate: string, reason: string, userId: string) {
    const date = new Date(reversalDate);
    if (isNaN(date.getTime())) throw new AppError(400, 'Invalid reversal date');
    return engine.reverseJournalEntry(id, date, reason, userId);
  }

  async getTrialBalance(asOfDate: string) {
    const { ReportsEngine } = await import('../../core/accounting/reports.engine');
    const reportsEngine = new ReportsEngine(prisma);
    return reportsEngine.getTrialBalance(new Date(asOfDate));
  }
}
