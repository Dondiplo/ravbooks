import { Decimal } from 'decimal.js';
import { AccountType, NormalBalance, EntryStatus } from '@prisma/client';

export { AccountType, NormalBalance, EntryStatus };

export interface JournalEntryLineInput {
  accountId: string;
  debit: Decimal | number | string;
  credit: Decimal | number | string;
  description?: string;
  sortOrder?: number;
}

export interface JournalEntryInput {
  date: Date;
  description: string;
  reference?: string;
  sourceType?: string;
  sourceId?: string;
  lines: JournalEntryLineInput[];
  createdById: string;
}

export interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  normalBalance: NormalBalance;
  debitTotal: Decimal;
  creditTotal: Decimal;
  balance: Decimal; // positive = normal-balance side, negative = contra
}

export interface TrialBalanceRow extends AccountBalance {
  debitBalance: Decimal;
  creditBalance: Decimal;
}

export interface FinancialPeriod {
  startDate: Date;
  endDate: Date;
}

export interface IncomeStatementData {
  period: FinancialPeriod;
  revenue: RevenueSection;
  costOfGoodsSold: COGSSection;
  grossProfit: Decimal;
  operatingExpenses: ExpenseSection[];
  totalOperatingExpenses: Decimal;
  operatingIncome: Decimal;
  otherIncome: Decimal;
  otherExpenses: Decimal;
  netIncome: Decimal;
}

export interface RevenueSection {
  accounts: AccountBalance[];
  total: Decimal;
}

export interface COGSSection {
  accounts: AccountBalance[];
  total: Decimal;
}

export interface ExpenseSection {
  category: string;
  accounts: AccountBalance[];
  total: Decimal;
}

export interface BalanceSheetData {
  asOfDate: Date;
  assets: {
    current: AccountBalance[];
    nonCurrent: AccountBalance[];
    totalCurrent: Decimal;
    totalNonCurrent: Decimal;
    total: Decimal;
  };
  liabilities: {
    current: AccountBalance[];
    nonCurrent: AccountBalance[];
    totalCurrent: Decimal;
    totalNonCurrent: Decimal;
    total: Decimal;
  };
  equity: {
    accounts: AccountBalance[];
    total: Decimal;
  };
  totalLiabilitiesAndEquity: Decimal;
  isBalanced: boolean;
}

export interface CashFlowData {
  period: FinancialPeriod;
  operating: {
    items: CashFlowItem[];
    total: Decimal;
  };
  investing: {
    items: CashFlowItem[];
    total: Decimal;
  };
  financing: {
    items: CashFlowItem[];
    total: Decimal;
  };
  netChange: Decimal;
  openingBalance: Decimal;
  closingBalance: Decimal;
}

export interface CashFlowItem {
  description: string;
  amount: Decimal;
}

export interface DashboardMetrics {
  totalRevenue: Decimal;
  totalExpenses: Decimal;
  netProfit: Decimal;
  netProfitMargin: number;
  totalReceivables: Decimal;
  totalPayables: Decimal;
  cashBalance: Decimal;
  overdueInvoices: number;
  lowStockItems: number;
  revenueByMonth: MonthlyData[];
  expensesByMonth: MonthlyData[];
  topExpenseCategories: CategoryData[];
}

export interface MonthlyData {
  month: string;
  amount: Decimal;
}

export interface CategoryData {
  category: string;
  amount: Decimal;
  percentage: number;
}

export type AccountSubtype =
  | 'CASH'
  | 'BANK'
  | 'ACCOUNTS_RECEIVABLE'
  | 'INVENTORY'
  | 'PREPAID'
  | 'FIXED_ASSET'
  | 'ACCUMULATED_DEPRECIATION'
  | 'ACCOUNTS_PAYABLE'
  | 'ACCRUED_LIABILITIES'
  | 'LONG_TERM_DEBT'
  | 'OWNER_EQUITY'
  | 'RETAINED_EARNINGS'
  | 'SALES'
  | 'OTHER_INCOME'
  | 'COST_OF_GOODS_SOLD'
  | 'OPERATING_EXPENSE'
  | 'OTHER_EXPENSE';

export const ACCOUNT_NORMAL_BALANCE: Record<AccountType, NormalBalance> = {
  ASSET: NormalBalance.DEBIT,
  EXPENSE: NormalBalance.DEBIT,
  LIABILITY: NormalBalance.CREDIT,
  EQUITY: NormalBalance.CREDIT,
  REVENUE: NormalBalance.CREDIT,
};
