/**
 * Double-Entry Accounting Engine
 *
 * Enforces the fundamental equation: Assets = Liabilities + Equity
 * Every transaction must have equal debits and credits.
 * Transactions are immutable — corrections are made via reversal entries.
 */

import { PrismaClient, EntryStatus, Account, AccountType, NormalBalance } from '@prisma/client';
import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';
import { JournalEntryInput, JournalEntryLineInput, AccountBalance } from '../../types/accounting.types';
import { generateEntryNumber } from '../../utils/sequence';
import { logger } from '../../utils/logger';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export class AccountingEngine {
  constructor(private prisma: PrismaClient) {}

  /**
   * Post a journal entry. Validates that debits === credits before writing.
   * Throws if the entry is unbalanced or accounts don't exist.
   */
  async postJournalEntry(input: JournalEntryInput) {
    const lines = input.lines.map((l) => ({
      ...l,
      debit: new Decimal(l.debit),
      credit: new Decimal(l.credit),
    }));

    this.validateEntry(lines);

    const accountIds = [...new Set(lines.map((l) => l.accountId))];
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: accountIds }, isActive: true },
    });

    if (accounts.length !== accountIds.length) {
      const missing = accountIds.filter((id) => !accounts.find((a) => a.id === id));
      throw new Error(`Accounts not found or inactive: ${missing.join(', ')}`);
    }

    const entryNumber = await generateEntryNumber(this.prisma);

    const entry = await this.prisma.$transaction(async (tx) => {
      const journalEntry = await tx.journalEntry.create({
        data: {
          id: uuidv4(),
          entryNumber,
          date: input.date,
          description: input.description,
          reference: input.reference,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          status: EntryStatus.POSTED,
          createdById: input.createdById,
          lines: {
            create: lines.map((l, idx) => ({
              id: uuidv4(),
              accountId: l.accountId,
              description: l.description,
              debit: l.debit.toFixed(2),
              credit: l.credit.toFixed(2),
              sortOrder: l.sortOrder ?? idx,
            })),
          },
        },
        include: { lines: { include: { account: true } } },
      });

      logger.info(`Journal entry posted: ${entryNumber}`, {
        entryId: journalEntry.id,
        lines: lines.length,
        totalDebit: this.sumDebits(lines).toFixed(2),
      });

      return journalEntry;
    });

    return entry;
  }

  /**
   * Reverse a posted journal entry.
   * Creates a new entry with all debits/credits swapped.
   * Marks the original entry as reversed.
   */
  async reverseJournalEntry(
    originalEntryId: string,
    reversalDate: Date,
    reason: string,
    createdById: string,
  ) {
    const original = await this.prisma.journalEntry.findUnique({
      where: { id: originalEntryId },
      include: { lines: true },
    });

    if (!original) throw new Error(`Journal entry ${originalEntryId} not found`);
    if (original.isReversed) throw new Error(`Entry ${original.entryNumber} is already reversed`);
    if (original.status !== EntryStatus.POSTED) {
      throw new Error(`Only POSTED entries can be reversed`);
    }

    const reversalNumber = await generateEntryNumber(this.prisma);

    const reversal = await this.prisma.$transaction(async (tx) => {
      const reversalEntry = await tx.journalEntry.create({
        data: {
          id: uuidv4(),
          entryNumber: reversalNumber,
          date: reversalDate,
          description: `REVERSAL: ${original.description} — ${reason}`,
          reference: original.entryNumber,
          sourceType: original.sourceType,
          sourceId: original.sourceId,
          status: EntryStatus.POSTED,
          reversalOf: original.id,
          createdById,
          lines: {
            create: original.lines.map((l, idx) => ({
              id: uuidv4(),
              accountId: l.accountId,
              description: l.description ? `[REV] ${l.description}` : '[REVERSAL]',
              debit: l.credit, // swap
              credit: l.debit, // swap
              sortOrder: l.sortOrder ?? idx,
            })),
          },
        },
        include: { lines: { include: { account: true } } },
      });

      await tx.journalEntry.update({
        where: { id: original.id },
        data: { isReversed: true, reversalId: reversalEntry.id },
      });

      logger.info(`Entry ${original.entryNumber} reversed as ${reversalNumber}`);
      return reversalEntry;
    });

    return reversal;
  }

  /**
   * Get the running balance of an account within a date range.
   * Balance is calculated from ledger data, never stored separately.
   */
  async getAccountBalance(
    accountId: string,
    asOfDate?: Date,
  ): Promise<AccountBalance> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error(`Account ${accountId} not found`);

    const where: Record<string, unknown> = { accountId };
    if (asOfDate) {
      where.journalEntry = { date: { lte: asOfDate }, status: EntryStatus.POSTED };
    } else {
      where.journalEntry = { status: EntryStatus.POSTED };
    }

    const agg = await this.prisma.journalEntryLine.aggregate({
      where,
      _sum: { debit: true, credit: true },
    });

    const debitTotal = new Decimal(agg._sum.debit?.toString() ?? '0');
    const creditTotal = new Decimal(agg._sum.credit?.toString() ?? '0');

    // Balance from the account's normal balance perspective
    let balance: Decimal;
    if (account.normalBalance === NormalBalance.DEBIT) {
      balance = debitTotal.minus(creditTotal);
    } else {
      balance = creditTotal.minus(debitTotal);
    }

    return {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      normalBalance: account.normalBalance,
      debitTotal,
      creditTotal,
      balance,
    };
  }

  /**
   * Get balances for all active accounts — used for trial balance and reports.
   */
  async getAllAccountBalances(asOfDate?: Date): Promise<AccountBalance[]> {
    const accounts = await this.prisma.account.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });

    const dateFilter = asOfDate
      ? { date: { lte: asOfDate }, status: EntryStatus.POSTED }
      : { status: EntryStatus.POSTED };

    const aggregations = await this.prisma.journalEntryLine.groupBy({
      by: ['accountId'],
      where: { journalEntry: dateFilter },
      _sum: { debit: true, credit: true },
    });

    const aggMap = new Map(aggregations.map((a) => [a.accountId, a]));

    return accounts.map((account) => {
      const agg = aggMap.get(account.id);
      const debitTotal = new Decimal(agg?._sum.debit?.toString() ?? '0');
      const creditTotal = new Decimal(agg?._sum.credit?.toString() ?? '0');

      let balance: Decimal;
      if (account.normalBalance === NormalBalance.DEBIT) {
        balance = debitTotal.minus(creditTotal);
      } else {
        balance = creditTotal.minus(debitTotal);
      }

      return {
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        normalBalance: account.normalBalance,
        debitTotal,
        creditTotal,
        balance,
      };
    });
  }

  /**
   * Get account balances for a specific period (between two dates).
   * Used for income statement — revenue/expense accounts are period-based.
   */
  async getAccountBalancesForPeriod(
    startDate: Date,
    endDate: Date,
    accountTypes?: AccountType[],
  ): Promise<AccountBalance[]> {
    const accountFilter: Record<string, unknown> = { isActive: true };
    if (accountTypes?.length) accountFilter.type = { in: accountTypes };

    const accounts = await this.prisma.account.findMany({
      where: accountFilter,
      orderBy: { code: 'asc' },
    });

    const aggregations = await this.prisma.journalEntryLine.groupBy({
      by: ['accountId'],
      where: {
        journalEntry: {
          date: { gte: startDate, lte: endDate },
          status: EntryStatus.POSTED,
        },
        accountId: { in: accounts.map((a) => a.id) },
      },
      _sum: { debit: true, credit: true },
    });

    const aggMap = new Map(aggregations.map((a) => [a.accountId, a]));

    return accounts.map((account) => {
      const agg = aggMap.get(account.id);
      const debitTotal = new Decimal(agg?._sum.debit?.toString() ?? '0');
      const creditTotal = new Decimal(agg?._sum.credit?.toString() ?? '0');

      let balance: Decimal;
      if (account.normalBalance === NormalBalance.DEBIT) {
        balance = debitTotal.minus(creditTotal);
      } else {
        balance = creditTotal.minus(debitTotal);
      }

      return {
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        normalBalance: account.normalBalance,
        debitTotal,
        creditTotal,
        balance,
      };
    });
  }

  /**
   * Validate that an entry's lines are balanced (sum of debits = sum of credits).
   * Also ensures no line has both debit and credit, and all amounts are non-negative.
   */
  private validateEntry(lines: Array<JournalEntryLineInput & { debit: Decimal; credit: Decimal }>) {
    if (lines.length < 2) {
      throw new Error('A journal entry must have at least 2 lines');
    }

    for (const line of lines) {
      if (line.debit.isNegative() || line.credit.isNegative()) {
        throw new Error('Debit and credit amounts must be non-negative');
      }
      if (line.debit.greaterThan(0) && line.credit.greaterThan(0)) {
        throw new Error('A single line cannot have both debit and credit');
      }
      if (line.debit.isZero() && line.credit.isZero()) {
        throw new Error('A line must have either a debit or a credit amount');
      }
    }

    const totalDebits = this.sumDebits(lines);
    const totalCredits = this.sumCredits(lines);

    if (!totalDebits.equals(totalCredits)) {
      throw new Error(
        `Journal entry is unbalanced: debits=${totalDebits.toFixed(2)}, credits=${totalCredits.toFixed(2)}`,
      );
    }

    if (totalDebits.isZero()) {
      throw new Error('Journal entry cannot have zero-value lines');
    }
  }

  private sumDebits(lines: Array<{ debit: Decimal }>) {
    return lines.reduce((sum, l) => sum.plus(l.debit), new Decimal(0));
  }

  private sumCredits(lines: Array<{ credit: Decimal }>) {
    return lines.reduce((sum, l) => sum.plus(l.credit), new Decimal(0));
  }
}
