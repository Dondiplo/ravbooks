import { config } from 'dotenv';
config();

import { PrismaClient, AccountType, NormalBalance, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Users ─────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const accountantHash = await bcrypt.hash('Accountant@123', 12);
  const staffHash = await bcrypt.hash('Staff@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@accountiq.com' },
    update: {},
    create: { name: 'System Admin', email: 'admin@accountiq.com', passwordHash: adminHash, role: Role.ADMIN },
  });

  await prisma.user.upsert({
    where: { email: 'accountant@accountiq.com' },
    update: {},
    create: { name: 'Jane Smith', email: 'accountant@accountiq.com', passwordHash: accountantHash, role: Role.ACCOUNTANT },
  });

  await prisma.user.upsert({
    where: { email: 'staff@accountiq.com' },
    update: {},
    create: { name: 'Bob Johnson', email: 'staff@accountiq.com', passwordHash: staffHash, role: Role.STAFF },
  });

  console.log('✅ Users created');

  // ─── Chart of Accounts ─────────────────────────────────────────────────────
  const accounts = [
    // ASSETS — Current
    { code: '1000', name: 'Cash on Hand',                type: AccountType.ASSET,     subtype: 'CASH',                 normalBalance: NormalBalance.DEBIT  },
    { code: '1010', name: 'Petty Cash',                  type: AccountType.ASSET,     subtype: 'CASH',                 normalBalance: NormalBalance.DEBIT  },
    { code: '1100', name: 'Checking Account',            type: AccountType.ASSET,     subtype: 'BANK',                 normalBalance: NormalBalance.DEBIT  },
    { code: '1110', name: 'Savings Account',             type: AccountType.ASSET,     subtype: 'BANK',                 normalBalance: NormalBalance.DEBIT  },
    { code: '1200', name: 'Accounts Receivable',         type: AccountType.ASSET,     subtype: 'ACCOUNTS_RECEIVABLE',  normalBalance: NormalBalance.DEBIT  },
    { code: '1210', name: 'Allowance for Doubtful Accts',type: AccountType.ASSET,     subtype: 'ACCOUNTS_RECEIVABLE',  normalBalance: NormalBalance.CREDIT },
    { code: '1300', name: 'Inventory',                   type: AccountType.ASSET,     subtype: 'INVENTORY',            normalBalance: NormalBalance.DEBIT  },
    { code: '1400', name: 'Prepaid Expenses',            type: AccountType.ASSET,     subtype: 'PREPAID',              normalBalance: NormalBalance.DEBIT  },
    // ASSETS — Non-Current
    { code: '1500', name: 'Property, Plant & Equipment', type: AccountType.ASSET,     subtype: 'FIXED_ASSET',          normalBalance: NormalBalance.DEBIT  },
    { code: '1510', name: 'Office Equipment',            type: AccountType.ASSET,     subtype: 'FIXED_ASSET',          normalBalance: NormalBalance.DEBIT  },
    { code: '1520', name: 'Vehicles',                    type: AccountType.ASSET,     subtype: 'FIXED_ASSET',          normalBalance: NormalBalance.DEBIT  },
    { code: '1590', name: 'Accumulated Depreciation',    type: AccountType.ASSET,     subtype: 'ACCUMULATED_DEPRECIATION', normalBalance: NormalBalance.CREDIT },
    // LIABILITIES — Current
    { code: '2000', name: 'Accounts Payable',            type: AccountType.LIABILITY, subtype: 'ACCOUNTS_PAYABLE',     normalBalance: NormalBalance.CREDIT },
    { code: '2100', name: 'Sales Tax Payable',           type: AccountType.LIABILITY, subtype: 'ACCRUED_LIABILITIES',  normalBalance: NormalBalance.CREDIT },
    { code: '2110', name: 'Income Tax Payable',          type: AccountType.LIABILITY, subtype: 'ACCRUED_LIABILITIES',  normalBalance: NormalBalance.CREDIT },
    { code: '2200', name: 'Accrued Salaries Payable',    type: AccountType.LIABILITY, subtype: 'ACCRUED_LIABILITIES',  normalBalance: NormalBalance.CREDIT },
    { code: '2300', name: 'Short-term Loans Payable',    type: AccountType.LIABILITY, subtype: 'ACCRUED_LIABILITIES',  normalBalance: NormalBalance.CREDIT },
    // LIABILITIES — Non-Current
    { code: '2500', name: 'Long-term Loans Payable',     type: AccountType.LIABILITY, subtype: 'LONG_TERM_DEBT',       normalBalance: NormalBalance.CREDIT },
    { code: '2510', name: 'Mortgage Payable',            type: AccountType.LIABILITY, subtype: 'LONG_TERM_DEBT',       normalBalance: NormalBalance.CREDIT },
    // EQUITY
    { code: '3000', name: "Owner's Capital",             type: AccountType.EQUITY,    subtype: 'OWNER_EQUITY',         normalBalance: NormalBalance.CREDIT },
    { code: '3100', name: "Owner's Drawings",            type: AccountType.EQUITY,    subtype: 'OWNER_EQUITY',         normalBalance: NormalBalance.DEBIT  },
    { code: '3200', name: 'Common Stock',                type: AccountType.EQUITY,    subtype: 'OWNER_EQUITY',         normalBalance: NormalBalance.CREDIT },
    { code: '3300', name: 'Retained Earnings',           type: AccountType.EQUITY,    subtype: 'RETAINED_EARNINGS',    normalBalance: NormalBalance.CREDIT },
    // REVENUE
    { code: '4000', name: 'Sales Revenue',               type: AccountType.REVENUE,   subtype: 'SALES',                normalBalance: NormalBalance.CREDIT },
    { code: '4100', name: 'Service Revenue',             type: AccountType.REVENUE,   subtype: 'SALES',                normalBalance: NormalBalance.CREDIT },
    { code: '4200', name: 'Other Income',                type: AccountType.REVENUE,   subtype: 'OTHER_INCOME',         normalBalance: NormalBalance.CREDIT },
    { code: '4300', name: 'Interest Income',             type: AccountType.REVENUE,   subtype: 'OTHER_INCOME',         normalBalance: NormalBalance.CREDIT },
    { code: '4900', name: 'Sales Discounts',             type: AccountType.REVENUE,   subtype: 'SALES',                normalBalance: NormalBalance.DEBIT  },
    // COGS
    { code: '5000', name: 'Cost of Goods Sold',          type: AccountType.EXPENSE,   subtype: 'COST_OF_GOODS_SOLD',   normalBalance: NormalBalance.DEBIT  },
    { code: '5100', name: 'Freight-in',                  type: AccountType.EXPENSE,   subtype: 'COST_OF_GOODS_SOLD',   normalBalance: NormalBalance.DEBIT  },
    // OPERATING EXPENSES
    { code: '6000', name: 'Salaries & Wages',            type: AccountType.EXPENSE,   subtype: 'OPERATING_EXPENSE',    normalBalance: NormalBalance.DEBIT  },
    { code: '6010', name: 'Payroll Taxes',               type: AccountType.EXPENSE,   subtype: 'OPERATING_EXPENSE',    normalBalance: NormalBalance.DEBIT  },
    { code: '6100', name: 'Rent Expense',                type: AccountType.EXPENSE,   subtype: 'OPERATING_EXPENSE',    normalBalance: NormalBalance.DEBIT  },
    { code: '6110', name: 'Utilities Expense',           type: AccountType.EXPENSE,   subtype: 'OPERATING_EXPENSE',    normalBalance: NormalBalance.DEBIT  },
    { code: '6200', name: 'Advertising & Marketing',     type: AccountType.EXPENSE,   subtype: 'OPERATING_EXPENSE',    normalBalance: NormalBalance.DEBIT  },
    { code: '6300', name: 'Travel & Entertainment',      type: AccountType.EXPENSE,   subtype: 'OPERATING_EXPENSE',    normalBalance: NormalBalance.DEBIT  },
    { code: '6400', name: 'Office Supplies',             type: AccountType.EXPENSE,   subtype: 'OPERATING_EXPENSE',    normalBalance: NormalBalance.DEBIT  },
    { code: '6500', name: 'Insurance Expense',           type: AccountType.EXPENSE,   subtype: 'OPERATING_EXPENSE',    normalBalance: NormalBalance.DEBIT  },
    { code: '6600', name: 'Depreciation Expense',        type: AccountType.EXPENSE,   subtype: 'OPERATING_EXPENSE',    normalBalance: NormalBalance.DEBIT  },
    { code: '6700', name: 'Bank Charges & Fees',         type: AccountType.EXPENSE,   subtype: 'OPERATING_EXPENSE',    normalBalance: NormalBalance.DEBIT  },
    { code: '6800', name: 'Professional Fees',           type: AccountType.EXPENSE,   subtype: 'OPERATING_EXPENSE',    normalBalance: NormalBalance.DEBIT  },
    { code: '6900', name: 'Miscellaneous Expense',       type: AccountType.EXPENSE,   subtype: 'OTHER_EXPENSE',        normalBalance: NormalBalance.DEBIT  },
  ];

  for (const account of accounts) {
    await prisma.account.upsert({ where: { code: account.code }, update: {}, create: account });
  }
  console.log('✅ Chart of accounts seeded (42 accounts)');

  // ─── Customers ─────────────────────────────────────────────────────────────
  const customers = [
    { code: 'CUST-0001', name: 'Acme Corporation',   email: 'billing@acme.com',    phone: '+1-555-0100', address: '123 Main St',  city: 'New York',    country: 'US', paymentTerms: 30 },
    { code: 'CUST-0002', name: 'Globex Industries',  email: 'accounts@globex.com', phone: '+1-555-0200', address: '456 Oak Ave',  city: 'Chicago',     country: 'US', paymentTerms: 15 },
    { code: 'CUST-0003', name: 'Initech Solutions',  email: 'finance@initech.com', phone: '+1-555-0300', address: '789 Pine Rd',  city: 'Austin',      country: 'US', paymentTerms: 45 },
    { code: 'CUST-0004', name: 'Umbrella Corp',      email: 'ap@umbrella.com',     phone: '+1-555-0400', address: '321 Elm St',   city: 'Los Angeles', country: 'US', paymentTerms: 30 },
  ];

  for (const c of customers) {
    await prisma.customer.upsert({ where: { code: c.code }, update: {}, create: c });
  }
  console.log('✅ Customers seeded');

  // ─── Suppliers ─────────────────────────────────────────────────────────────
  const suppliers = [
    { code: 'SUP-0001', name: 'Office Depot',       email: 'orders@officedepot.com',    phone: '+1-555-1000', paymentTerms: 30 },
    { code: 'SUP-0002', name: 'Tech Wholesale Inc', email: 'sales@techwholesale.com',   phone: '+1-555-1100', paymentTerms: 15 },
    { code: 'SUP-0003', name: 'Global Supplies Ltd', email: 'billing@globalsupplies.com', phone: '+1-555-1200', paymentTerms: 45 },
  ];

  for (const s of suppliers) {
    await prisma.supplier.upsert({ where: { code: s.code }, update: {}, create: s });
  }
  console.log('✅ Suppliers seeded');

  // ─── Inventory ─────────────────────────────────────────────────────────────
  const inventoryAccount  = await prisma.account.findFirst({ where: { code: '1300' } });
  const cogsAccount       = await prisma.account.findFirst({ where: { code: '5000' } });
  const salesAccount      = await prisma.account.findFirst({ where: { code: '4000' } });

  const inventoryItems = [
    { sku: 'PROD-001', name: 'Office Chair',       category: 'Furniture',       unit: 'unit', costPrice: 150,  sellingPrice: 299,   reorderLevel: 5,  quantityOnHand: 30 },
    { sku: 'PROD-002', name: 'Standing Desk',      category: 'Furniture',       unit: 'unit', costPrice: 400,  sellingPrice: 799,   reorderLevel: 3,  quantityOnHand: 15 },
    { sku: 'PROD-003', name: 'Laptop Stand',       category: 'Electronics',     unit: 'unit', costPrice: 30,   sellingPrice: 69.99, reorderLevel: 10, quantityOnHand: 8  },
    { sku: 'PROD-004', name: 'Wireless Mouse',     category: 'Electronics',     unit: 'unit', costPrice: 20,   sellingPrice: 45,    reorderLevel: 15, quantityOnHand: 50 },
    { sku: 'PROD-005', name: 'Printer Paper A4',   category: 'Office Supplies', unit: 'ream', costPrice: 5,    sellingPrice: 12,    reorderLevel: 20, quantityOnHand: 100 },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { sku: item.sku },
      update: {},
      create: {
        ...item,
        assetAccountId:   inventoryAccount?.id,
        cogsAccountId:    cogsAccount?.id,
        revenueAccountId: salesAccount?.id,
      },
    });
  }
  console.log('✅ Inventory seeded (PROD-001 to PROD-005)');

  // ─── Opening Balance Journal Entry ─────────────────────────────────────────
  const cashAccount   = await prisma.account.findFirst({ where: { code: '1100' } });
  const equityAccount = await prisma.account.findFirst({ where: { code: '3000' } });

  if (cashAccount && equityAccount) {
    const existing = await prisma.journalEntry.findFirst({ where: { entryNumber: 'OPENING-001' } });
    if (!existing) {
      await prisma.journalEntry.create({
        data: {
          entryNumber: 'OPENING-001',
          date:        new Date('2025-01-01'),
          description: 'Opening Balance',
          reference:   'OPENING',
          status:      'POSTED',
          createdById: admin.id,
          lines: {
            create: [
              { accountId: cashAccount.id,   debit: 50000, credit: 0,     description: 'Opening cash balance',   sortOrder: 0 },
              { accountId: equityAccount.id, debit: 0,     credit: 50000, description: "Owner's opening capital", sortOrder: 1 },
            ],
          },
        },
      });
    }
  }
  console.log('✅ Opening balance: $50,000 (Cash / Owner\'s Capital)');

  console.log('\n🎉 Seed complete!\n');
  console.log('Demo credentials:');
  console.log('  Admin:       admin@accountiq.com      /  Admin@123');
  console.log('  Accountant:  accountant@accountiq.com /  Accountant@123');
  console.log('  Staff:       staff@accountiq.com      /  Staff@123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
