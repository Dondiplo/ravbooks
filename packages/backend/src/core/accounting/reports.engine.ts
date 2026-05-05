/**
 * Financial Reports Engine
 * All reports derive exclusively from ledger data — no denormalized caches.
 */

import { PrismaClient, AccountType, NormalBalance, EntryStatus } from '@prisma/client';
import Decimal from 'decimal.js';
import {
  IncomeStatementData,
  BalanceSheetData,
  CashFlowData,
  AccountBalance,
  TrialBalanceRow,
  FinancialPeriod,
} from '../../types/accounting.types';
import { AccountingEngine } from './engine';

export class ReportsEngine {
  private engine: AccountingEngine;

  constructor(private prisma: PrismaClient) {
    this.engine = new AccountingEngine(prisma);
  }

  async getTrialBalance(asOfDate: Date): Promise<TrialBalanceRow[]> {
    const balances = await this.engine.getAllAccountBalances(asOfDate);

    return balances
      .filter((b) => !b.debitTotal.isZero() || !b.creditTotal.isZero())
      .map((b) => ({
        ...b,
        debitBalance: b.normalBalance === NormalBalance.DEBIT && b.balance.greaterThan(0)
          ? b.balance
          : new Decimal(0),
        creditBalance: b.normalBalance === NormalBalance.CREDIT && b.balance.greaterThan(0)
          ? b.balance
          : new Decimal(0),
      }));
  }

  async getIncomeStatement(startDate: Date, endDate: Date): Promise<IncomeStatementData> {
    const period: FinancialPeriod = { startDate, endDate };

    const allBalances = await this.engine.getAccountBalancesForPeriod(
      startDate,
      endDate,
      [AccountType.REVENUE, AccountType.EXPENSE],
    );

    const revenueBalances = allBalances.filter(
      (b) => b.accountType === AccountType.REVENUE && !b.balance.isZero(),
    );

    // Split COGS (5xxx) vs operating expenses (6xxx+)
    const expenseBalances = allBalances.filter(
      (b) => b.accountType === AccountType.EXPENSE && !b.balance.isZero(),
    );

    const cogsBalances = expenseBalances.filter((b) => b.accountCode.startsWith('5'));
    const opexBalances = expenseBalances.filter((b) => !b.accountCode.startsWith('5'));

    const totalRevenue = revenueBalances.reduce((s, b) => s.plus(b.balance), new Decimal(0));
    const totalCOGS = cogsBalances.reduce((s, b) => s.plus(b.balance), new Decimal(0));
    const grossProfit = totalRevenue.minus(totalCOGS);

    // Group operating expenses by subtype/category
    const opexByCategory = this.groupExpensesByCategory(opexBalances);
    const totalOpex = opexBalances.reduce((s, b) => s.plus(b.balance), new Decimal(0));
    const operatingIncome = grossProfit.minus(totalOpex);

    return {
      period,
      revenue: { accounts: revenueBalances, total: totalRevenue },
      costOfGoodsSold: { accounts: cogsBalances, total: totalCOGS },
      grossProfit,
      operatingExpenses: opexByCategory,
      totalOperatingExpenses: totalOpex,
      operatingIncome,
      otherIncome: new Decimal(0),
      otherExpenses: new Decimal(0),
      netIncome: operatingIncome,
    };
  }

  async getBalanceSheet(asOfDate: Date): Promise<BalanceSheetData> {
    const allBalances = await this.engine.getAllAccountBalances(asOfDate);

    // Compute retained earnings: accumulate all income/expense from beginning of time
    const allPeriodBalances = await this.engine.getAccountBalancesForPeriod(
      new Date('1970-01-01'),
      asOfDate,
      [AccountType.REVENUE, AccountType.EXPENSE],
    );
    const retainedEarnings = allPeriodBalances.reduce((sum, b) => {
      if (b.accountType === AccountType.REVENUE) return sum.plus(b.balance);
      if (b.accountType === AccountType.EXPENSE) return sum.minus(b.balance);
      return sum;
    }, new Decimal(0));

    const assets = allBalances.filter((b) => b.accountType === AccountType.ASSET);
    const liabilities = allBalances.filter((b) => b.accountType === AccountType.LIABILITY);
    const equity = allBalances.filter((b) => b.accountType === AccountType.EQUITY);

    const currentAssets = assets.filter((b) => this.isCurrentAccount(b.accountCode));
    const nonCurrentAssets = assets.filter((b) => !this.isCurrentAccount(b.accountCode));

    const currentLiabilities = liabilities.filter((b) => this.isCurrentAccount(b.accountCode));
    const nonCurrentLiabilities = liabilities.filter(
      (b) => !this.isCurrentAccount(b.accountCode),
    );

    const totalCurrentAssets = currentAssets.reduce((s, b) => s.plus(b.balance), new Decimal(0));
    const totalNonCurrentAssets = nonCurrentAssets.reduce(
      (s, b) => s.plus(b.balance),
      new Decimal(0),
    );
    const totalAssets = totalCurrentAssets.plus(totalNonCurrentAssets);

    const totalCurrentLiabilities = currentLiabilities.reduce(
      (s, b) => s.plus(b.balance),
      new Decimal(0),
    );
    const totalNonCurrentLiabilities = nonCurrentLiabilities.reduce(
      (s, b) => s.plus(b.balance),
      new Decimal(0),
    );
    const totalLiabilities = totalCurrentLiabilities.plus(totalNonCurrentLiabilities);

    const equityFromAccounts = equity.reduce((s, b) => s.plus(b.balance), new Decimal(0));
    const totalEquity = equityFromAccounts.plus(retainedEarnings);

    const totalLiabilitiesAndEquity = totalLiabilities.plus(totalEquity);

    // Add retained earnings as a synthetic equity entry
    const equityWithRetained = [
      ...equity,
      {
        accountId: 'retained-earnings',
        accountCode: '3900',
        accountName: 'Retained Earnings (Current Period)',
        accountType: AccountType.EQUITY,
        normalBalance: NormalBalance.CREDIT,
        debitTotal: new Decimal(0),
        creditTotal: retainedEarnings.isPositive() ? retainedEarnings : new Decimal(0),
        balance: retainedEarnings,
      },
    ];

    return {
      asOfDate,
      assets: {
        current: currentAssets,
        nonCurrent: nonCurrentAssets,
        totalCurrent: totalCurrentAssets,
        totalNonCurrent: totalNonCurrentAssets,
        total: totalAssets,
      },
      liabilities: {
        current: currentLiabilities,
        nonCurrent: nonCurrentLiabilities,
        totalCurrent: totalCurrentLiabilities,
        totalNonCurrent: totalNonCurrentLiabilities,
        total: totalLiabilities,
      },
      equity: {
        accounts: equityWithRetained,
        total: totalEquity,
      },
      totalLiabilitiesAndEquity,
      isBalanced: totalAssets.minus(totalLiabilitiesAndEquity).abs().lessThan('0.01'),
    };
  }

  async getCashFlowStatement(startDate: Date, endDate: Date): Promise<CashFlowData> {
    const period: FinancialPeriod = { startDate, endDate };

    // Find cash/bank accounts (code 1000-1099)
    const cashAccounts = await this.prisma.account.findMany({
      where: {
        type: AccountType.ASSET,
        subtype: { in: ['CASH', 'BANK'] },
        isActive: true,
      },
    });

    const cashAccountIds = cashAccounts.map((a) => a.id);

    // Get opening balance of cash accounts
    const openingAgg = await this.prisma.journalEntryLine.aggregate({
      where: {
        accountId: { in: cashAccountIds },
        journalEntry: {
          date: { lt: startDate },
          status: EntryStatus.POSTED,
        },
      },
      _sum: { debit: true, credit: true },
    });

    const openingDebit = new Decimal(openingAgg._sum.debit?.toString() ?? '0');
    const openingCredit = new Decimal(openingAgg._sum.credit?.toString() ?? '0');
    const openingBalance = openingDebit.minus(openingCredit);

    // Get period cash movements by source type
    const cashMovements = await this.prisma.journalEntryLine.findMany({
      where: {
        accountId: { in: cashAccountIds },
        journalEntry: {
          date: { gte: startDate, lte: endDate },
          status: EntryStatus.POSTED,
        },
      },
      include: {
        journalEntry: true,
        account: true,
      },
    });

    const operatingItems: Array<{ description: string; amount: Decimal }> = [];
    const investingItems: Array<{ description: string; amount: Decimal }> = [];
    const financingItems: Array<{ description: string; amount: Decimal }> = [];

    const entryGroups = new Map<string, typeof cashMovements>();
    for (const m of cashMovements) {
      if (!entryGroups.has(m.journalEntryId)) entryGroups.set(m.journalEntryId, []);
      entryGroups.get(m.journalEntryId)!.push(m);
    }

    for (const [, lines] of entryGroups) {
      const entry = lines[0].journalEntry;
      const cashEffect = lines.reduce(
        (s, l) => s.plus(new Decimal(l.debit.toString())).minus(new Decimal(l.credit.toString())),
        new Decimal(0),
      );

      const item = { description: entry.description, amount: cashEffect };

      if (entry.sourceType === 'purchase_order' || entry.sourceType === 'fixed_asset') {
        investingItems.push(item);
      } else if (entry.sourceType === 'financing') {
        financingItems.push(item);
      } else {
        operatingItems.push(item);
      }
    }

    const totalOperating = operatingItems.reduce((s, i) => s.plus(i.amount), new Decimal(0));
    const totalInvesting = investingItems.reduce((s, i) => s.plus(i.amount), new Decimal(0));
    const totalFinancing = financingItems.reduce((s, i) => s.plus(i.amount), new Decimal(0));
    const netChange = totalOperating.plus(totalInvesting).plus(totalFinancing);
    const closingBalance = openingBalance.plus(netChange);

    return {
      period,
      operating: { items: operatingItems, total: totalOperating },
      investing: { items: investingItems, total: totalInvesting },
      financing: { items: financingItems, total: totalFinancing },
      netChange,
      openingBalance,
      closingBalance,
    };
  }

  private isCurrentAccount(code: string): boolean {
    const codeNum = parseInt(code, 10);
    // 1000-1499 = current assets; 2000-2499 = current liabilities
    return (codeNum >= 1000 && codeNum <= 1499) || (codeNum >= 2000 && codeNum <= 2499);
  }

  private groupExpensesByCategory(
    balances: AccountBalance[],
  ): Array<{ category: string; accounts: AccountBalance[]; total: Decimal }> {
    const groups = new Map<string, AccountBalance[]>();

    for (const b of balances) {
      const category = b.accountCode.startsWith('60')
        ? 'Payroll'
        : b.accountCode.startsWith('61')
        ? 'Rent & Utilities'
        : b.accountCode.startsWith('62')
        ? 'Marketing'
        : b.accountCode.startsWith('63')
        ? 'Travel'
        : 'General & Administrative';

      if (!groups.has(category)) groups.set(category, []);
      groups.get(category)!.push(b);
    }

    return [...groups.entries()].map(([category, accounts]) => ({
      category,
      accounts,
      total: accounts.reduce((s, a) => s.plus(a.balance), new Decimal(0)),
    }));
  }
}
