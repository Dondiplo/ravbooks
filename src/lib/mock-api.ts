// Demo mode: returns realistic sample data without a backend connection.
// Active when NEXT_PUBLIC_API_URL is not set in the environment.

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

// ─── Seed data ────────────────────────────────────────────────────────────────

const DEMO_USER = {
  id: 'usr_demo_admin',
  name: 'Alex Johnson',
  email: 'admin@demo.com',
  role: 'ADMIN' as const,
};

const CUSTOMERS = [
  { id: 'cust_1', name: 'Greenfield Technologies', email: 'billing@greenfield.io', phone: '+1 555-0101', address: '100 Silicon Ave, San Jose, CA' },
  { id: 'cust_2', name: 'Summit Retail Group', email: 'ap@summitretail.com', phone: '+1 555-0102', address: '45 Market St, Chicago, IL' },
  { id: 'cust_3', name: 'Harbor Logistics LLC', email: 'finance@harborlogistics.com', phone: '+1 555-0103', address: '800 Port Drive, Houston, TX' },
  { id: 'cust_4', name: 'Pinnacle Health Systems', email: 'accounts@pinnaclehealth.org', phone: '+1 555-0104', address: '22 Medical Pkwy, Boston, MA' },
];

const SUPPLIERS = [
  { id: 'supp_1', name: 'Global Parts Co.', email: 'orders@globalparts.com', phone: '+1 555-0201', contactName: 'Maria Santos' },
  { id: 'supp_2', name: 'TechSource Inc.', email: 'sales@techsource.com', phone: '+1 555-0202', contactName: 'David Chen' },
];

const ACCOUNTS = [
  { id: 'acc_1000', code: '1000', name: 'Cash on Hand', type: 'ASSET', subtype: 'CASH', balance: 24500, isActive: true },
  { id: 'acc_1010', code: '1010', name: 'Business Checking', type: 'ASSET', subtype: 'BANK', balance: 87340, isActive: true },
  { id: 'acc_1200', code: '1200', name: 'Accounts Receivable', type: 'ASSET', subtype: 'RECEIVABLE', balance: 62800, isActive: true },
  { id: 'acc_1400', code: '1400', name: 'Inventory Asset', type: 'ASSET', subtype: 'INVENTORY', balance: 31200, isActive: true },
  { id: 'acc_1500', code: '1500', name: 'Office Equipment', type: 'ASSET', subtype: 'FIXED_ASSET', balance: 18000, isActive: true },
  { id: 'acc_2000', code: '2000', name: 'Accounts Payable', type: 'LIABILITY', subtype: 'PAYABLE', balance: 14200, isActive: true },
  { id: 'acc_2100', code: '2100', name: 'Accrued Liabilities', type: 'LIABILITY', subtype: 'ACCRUED', balance: 5800, isActive: true },
  { id: 'acc_2200', code: '2200', name: 'Deferred Revenue', type: 'LIABILITY', subtype: 'DEFERRED', balance: 3000, isActive: true },
  { id: 'acc_3000', code: '3000', name: "Owner's Equity", type: 'EQUITY', subtype: 'EQUITY', balance: 180840, isActive: true },
  { id: 'acc_4000', code: '4000', name: 'Service Revenue', type: 'REVENUE', subtype: 'REVENUE', balance: 148000, isActive: true },
  { id: 'acc_4100', code: '4100', name: 'Product Sales', type: 'REVENUE', subtype: 'REVENUE', balance: 56400, isActive: true },
  { id: 'acc_5000', code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', subtype: 'COGS', balance: 38200, isActive: true },
  { id: 'acc_6000', code: '6000', name: 'Salaries & Wages', type: 'EXPENSE', subtype: 'OPERATING', balance: 72000, isActive: true },
  { id: 'acc_6100', code: '6100', name: 'Rent Expense', type: 'EXPENSE', subtype: 'OPERATING', balance: 24000, isActive: true },
  { id: 'acc_6200', code: '6200', name: 'Utilities Expense', type: 'EXPENSE', subtype: 'OPERATING', balance: 4800, isActive: true },
  { id: 'acc_6300', code: '6300', name: 'Office Supplies', type: 'EXPENSE', subtype: 'OPERATING', balance: 1640, isActive: true },
  { id: 'acc_6400', code: '6400', name: 'Marketing & Ads', type: 'EXPENSE', subtype: 'OPERATING', balance: 8200, isActive: true },
];

const today = new Date();
const d = (offset: number) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString();
};

const INVOICES = [
  {
    id: 'inv_1', invoiceNumber: 'INV-2025-001', customer: CUSTOMERS[0],
    date: d(-45), dueDate: d(-15), total: 12500, amountPaid: 12500, balanceDue: 0,
    status: 'PAID', notes: 'Q1 consulting services',
    items: [{ description: 'Software consulting', quantity: 25, unitPrice: 500, total: 12500 }],
  },
  {
    id: 'inv_2', invoiceNumber: 'INV-2025-002', customer: CUSTOMERS[1],
    date: d(-30), dueDate: d(0), total: 8750, amountPaid: 0, balanceDue: 8750,
    status: 'SENT', notes: 'Retail system integration',
    items: [{ description: 'System integration', quantity: 1, unitPrice: 8750, total: 8750 }],
  },
  {
    id: 'inv_3', invoiceNumber: 'INV-2025-003', customer: CUSTOMERS[2],
    date: d(-60), dueDate: d(-30), total: 22400, amountPaid: 10000, balanceDue: 12400,
    status: 'PARTIALLY_PAID', notes: 'Logistics software phase 1',
    items: [{ description: 'Logistics platform', quantity: 1, unitPrice: 22400, total: 22400 }],
  },
  {
    id: 'inv_4', invoiceNumber: 'INV-2025-004', customer: CUSTOMERS[3],
    date: d(-50), dueDate: d(-20), total: 5600, amountPaid: 0, balanceDue: 5600,
    status: 'OVERDUE', notes: 'Healthcare module',
    items: [{ description: 'Healthcare compliance module', quantity: 1, unitPrice: 5600, total: 5600 }],
  },
  {
    id: 'inv_5', invoiceNumber: 'INV-2025-005', customer: CUSTOMERS[0],
    date: d(-10), dueDate: d(20), total: 9200, amountPaid: 0, balanceDue: 9200,
    status: 'SENT', notes: 'Q2 retainer',
    items: [{ description: 'Monthly retainer — April', quantity: 1, unitPrice: 9200, total: 9200 }],
  },
  {
    id: 'inv_6', invoiceNumber: 'INV-2025-006', customer: CUSTOMERS[1],
    date: d(-3), dueDate: d(27), total: 3400, amountPaid: 0, balanceDue: 3400,
    status: 'DRAFT', notes: 'Training workshop',
    items: [{ description: 'Staff training (2 days)', quantity: 2, unitPrice: 1700, total: 3400 }],
  },
  {
    id: 'inv_7', invoiceNumber: 'INV-2025-007', customer: CUSTOMERS[2],
    date: d(-75), dueDate: d(-45), total: 15800, amountPaid: 15800, balanceDue: 0,
    status: 'PAID', notes: 'Annual maintenance',
    items: [{ description: 'Annual support contract', quantity: 1, unitPrice: 15800, total: 15800 }],
  },
  {
    id: 'inv_8', invoiceNumber: 'INV-2025-008', customer: CUSTOMERS[3],
    date: d(-55), dueDate: d(-25), total: 7100, amountPaid: 0, balanceDue: 7100,
    status: 'OVERDUE', notes: 'Data migration',
    items: [{ description: 'Data migration services', quantity: 1, unitPrice: 7100, total: 7100 }],
  },
];

const EXPENSES = [
  {
    id: 'exp_1', description: 'Monthly office rent', amount: 4000, taxRate: 0, total: 4000,
    category: 'Rent', date: d(-5), status: 'APPROVED', paymentMethod: 'BANK_TRANSFER',
    expenseAccount: { name: 'Rent Expense' }, paymentAccount: { name: 'Business Checking' },
  },
  {
    id: 'exp_2', description: 'AWS cloud services — April', amount: 1240, taxRate: 0, total: 1240,
    category: 'Utilities', date: d(-3), status: 'APPROVED', paymentMethod: 'CREDIT_CARD',
    expenseAccount: { name: 'Utilities Expense' }, paymentAccount: { name: 'Business Checking' },
  },
  {
    id: 'exp_3', description: 'Team lunch — client meeting', amount: 380, taxRate: 0, total: 380,
    category: 'Office Supplies', date: d(-1), status: 'PENDING', paymentMethod: 'CASH',
    expenseAccount: { name: 'Office Supplies' }, paymentAccount: { name: 'Cash on Hand' },
  },
  {
    id: 'exp_4', description: 'Google Ads campaign — Q2', amount: 2800, taxRate: 0, total: 2800,
    category: 'Marketing', date: d(-8), status: 'APPROVED', paymentMethod: 'CREDIT_CARD',
    expenseAccount: { name: 'Marketing & Ads' }, paymentAccount: { name: 'Business Checking' },
  },
  {
    id: 'exp_5', description: 'Accounting software license', amount: 299, taxRate: 0, total: 299,
    category: 'Professional Services', date: d(-12), status: 'APPROVED', paymentMethod: 'CREDIT_CARD',
    expenseAccount: { name: 'Office Supplies' }, paymentAccount: { name: 'Business Checking' },
  },
  {
    id: 'exp_6', description: 'Conference travel — San Francisco', amount: 1850, taxRate: 0, total: 1850,
    category: 'Travel', date: d(-2), status: 'PENDING', paymentMethod: 'BANK_TRANSFER',
    expenseAccount: { name: 'Office Supplies' }, paymentAccount: { name: 'Business Checking' },
  },
];

const INVENTORY = [
  {
    id: 'item_1', sku: 'SW-001', name: 'Enterprise License Pack', category: 'Software',
    unit: 'license', costPrice: 450, sellingPrice: 850, quantityOnHand: 24, reorderLevel: 5,
    isActive: true, isLowStock: false, totalValue: 10800,
  },
  {
    id: 'item_2', sku: 'HW-002', name: 'Wireless Keyboard & Mouse Combo', category: 'Hardware',
    unit: 'set', costPrice: 65, sellingPrice: 120, quantityOnHand: 3, reorderLevel: 10,
    isActive: true, isLowStock: true, totalValue: 195,
  },
  {
    id: 'item_3', sku: 'HW-003', name: '4K Monitor 27"', category: 'Hardware',
    unit: 'unit', costPrice: 380, sellingPrice: 620, quantityOnHand: 8, reorderLevel: 5,
    isActive: true, isLowStock: false, totalValue: 3040,
  },
  {
    id: 'item_4', sku: 'SW-002', name: 'Security Suite Annual', category: 'Software',
    unit: 'subscription', costPrice: 120, sellingPrice: 280, quantityOnHand: 2, reorderLevel: 5,
    isActive: true, isLowStock: true, totalValue: 240,
  },
  {
    id: 'item_5', sku: 'SVC-001', name: 'Installation Service Token', category: 'Services',
    unit: 'token', costPrice: 200, sellingPrice: 400, quantityOnHand: 15, reorderLevel: 3,
    isActive: true, isLowStock: false, totalValue: 3000,
  },
];

const JOURNAL_ENTRIES = [
  {
    id: 'je_1', reference: 'INV-2025-001', description: 'Invoice payment received — Greenfield Technologies',
    date: d(-45), status: 'POSTED', createdBy: { name: 'Alex Johnson' },
    lines: [
      { account: { code: '1010', name: 'Business Checking' }, debit: '12500.00', credit: '0.00' },
      { account: { code: '1200', name: 'Accounts Receivable' }, debit: '0.00', credit: '12500.00' },
    ],
  },
  {
    id: 'je_2', reference: 'EXP-001', description: 'Rent payment — April 2025',
    date: d(-5), status: 'POSTED', createdBy: { name: 'Alex Johnson' },
    lines: [
      { account: { code: '6100', name: 'Rent Expense' }, debit: '4000.00', credit: '0.00' },
      { account: { code: '1010', name: 'Business Checking' }, debit: '0.00', credit: '4000.00' },
    ],
  },
  {
    id: 'je_3', reference: 'INV-2025-003', description: 'Partial payment — Harbor Logistics LLC',
    date: d(-20), status: 'POSTED', createdBy: { name: 'Alex Johnson' },
    lines: [
      { account: { code: '1010', name: 'Business Checking' }, debit: '10000.00', credit: '0.00' },
      { account: { code: '1200', name: 'Accounts Receivable' }, debit: '0.00', credit: '10000.00' },
    ],
  },
  {
    id: 'je_4', reference: 'EXP-004', description: 'Google Ads — Q2 campaign',
    date: d(-8), status: 'POSTED', createdBy: { name: 'Alex Johnson' },
    lines: [
      { account: { code: '6400', name: 'Marketing & Ads' }, debit: '2800.00', credit: '0.00' },
      { account: { code: '1010', name: 'Business Checking' }, debit: '0.00', credit: '2800.00' },
    ],
  },
  {
    id: 'je_5', reference: 'INV-2025-007', description: 'Invoice payment received — Harbor Logistics LLC',
    date: d(-75), status: 'POSTED', createdBy: { name: 'Alex Johnson' },
    lines: [
      { account: { code: '1010', name: 'Business Checking' }, debit: '15800.00', credit: '0.00' },
      { account: { code: '1200', name: 'Accounts Receivable' }, debit: '0.00', credit: '15800.00' },
    ],
  },
];

const MONTHLY_DATA = (() => {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today);
    d.setMonth(d.getMonth() - i);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    months.push({
      month: label,
      revenue: Math.round(30000 + Math.random() * 25000),
      expenses: Math.round(18000 + Math.random() * 10000),
    });
  }
  return months;
})();

// ─── Mock API implementations ─────────────────────────────────────────────────

export const mockAuthApi = {
  login: async (_email: string, _password: string) => {
    await delay();
    return {
      accessToken: 'demo_access_token',
      refreshToken: 'demo_refresh_token',
      user: DEMO_USER,
    };
  },
  me: async () => {
    await delay(100);
    return DEMO_USER;
  },
  changePassword: async () => { await delay(); return {}; },
};

export const mockAccountsApi = {
  list: async () => { await delay(); return ACCOUNTS; },
  get: async (id: string) => { await delay(); return ACCOUNTS.find((a) => a.id === id) ?? ACCOUNTS[0]; },
  create: async (data: unknown) => { await delay(); return { id: 'acc_new', ...(data as object) }; },
  update: async (_id: string, data: unknown) => { await delay(); return data; },
  getBalance: async (id: string) => {
    await delay();
    const acc = ACCOUNTS.find((a) => a.id === id);
    return { accountId: id, balance: acc?.balance ?? 0, debitTotal: acc?.balance ?? 0, creditTotal: 0 };
  },
  getLedger: async (id: string) => {
    await delay();
    const acc = ACCOUNTS.find((a) => a.id === id);
    return {
      account: acc,
      entries: JOURNAL_ENTRIES.slice(0, 5).map((je, i) => ({
        id: je.id,
        date: je.date,
        description: je.description,
        reference: je.reference,
        debit: i % 2 === 0 ? '500.00' : '0.00',
        credit: i % 2 !== 0 ? '500.00' : '0.00',
        balance: ((acc?.balance ?? 0) - i * 500).toFixed(2),
      })),
    };
  },
};

export const mockJournalApi = {
  list: async () => {
    await delay();
    return { entries: JOURNAL_ENTRIES, total: JOURNAL_ENTRIES.length, page: 1, totalPages: 1 };
  },
  get: async (id: string) => {
    await delay();
    return JOURNAL_ENTRIES.find((je) => je.id === id) ?? JOURNAL_ENTRIES[0];
  },
  create: async (data: unknown) => { await delay(); return { id: 'je_new', ...(data as object) }; },
  reverse: async () => { await delay(); return {}; },
  trialBalance: async () => {
    await delay();
    return ACCOUNTS.map((a) => ({
      accountId: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      debitBalance: ['ASSET', 'EXPENSE'].includes(a.type) ? a.balance : 0,
      creditBalance: ['LIABILITY', 'EQUITY', 'REVENUE'].includes(a.type) ? a.balance : 0,
    }));
  },
};

export const mockInvoicesApi = {
  list: async (params?: Record<string, unknown>) => {
    await delay();
    let filtered = [...INVOICES];
    if (params?.status) filtered = filtered.filter((i) => i.status === params.status);
    if (params?.search) {
      const s = String(params.search).toLowerCase();
      filtered = filtered.filter(
        (i) => i.invoiceNumber.toLowerCase().includes(s) || i.customer.name.toLowerCase().includes(s),
      );
    }
    return { invoices: filtered, total: filtered.length, page: 1, totalPages: 1 };
  },
  stats: async () => {
    await delay();
    return {
      total: INVOICES.length,
      paid: INVOICES.filter((i) => i.status === 'PAID').length,
      pending: INVOICES.filter((i) => ['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(i.status)).length,
      monthRevenue: 28300,
    };
  },
  get: async (id: string) => {
    await delay();
    return INVOICES.find((i) => i.id === id) ?? INVOICES[0];
  },
  create: async (data: unknown) => { await delay(); return { id: 'inv_new', ...(data as object) }; },
  send: async () => { await delay(); return {}; },
  recordPayment: async () => { await delay(); return {}; },
  cancel: async () => { await delay(); return {}; },
};

export const mockExpensesApi = {
  list: async (params?: Record<string, unknown>) => {
    await delay();
    let filtered = [...EXPENSES];
    if (params?.status) filtered = filtered.filter((e) => e.status === params.status);
    if (params?.category) filtered = filtered.filter((e) => e.category === params.category);
    if (params?.search) {
      const s = String(params.search).toLowerCase();
      filtered = filtered.filter((e) => e.description.toLowerCase().includes(s));
    }
    return { expenses: filtered, total: filtered.length, page: 1, totalPages: 1 };
  },
  get: async (id: string) => {
    await delay();
    return EXPENSES.find((e) => e.id === id) ?? EXPENSES[0];
  },
  create: async (data: unknown) => { await delay(); return { id: 'exp_new', ...(data as object) }; },
  approve: async () => { await delay(); return {}; },
  reject: async () => { await delay(); return {}; },
  categoryStats: async () => {
    await delay();
    return [
      { category: 'Rent', total: 4000, count: 1 },
      { category: 'Utilities', total: 1240, count: 1 },
      { category: 'Marketing', total: 2800, count: 1 },
      { category: 'Travel', total: 1850, count: 1 },
      { category: 'Office Supplies', total: 679, count: 2 },
    ];
  },
};

export const mockInventoryApi = {
  list: async (params?: Record<string, unknown>) => {
    await delay();
    let filtered = [...INVENTORY];
    if (params?.lowStock) filtered = filtered.filter((i) => i.isLowStock);
    if (params?.search) {
      const s = String(params.search).toLowerCase();
      filtered = filtered.filter(
        (i) => i.name.toLowerCase().includes(s) || i.sku.toLowerCase().includes(s),
      );
    }
    return { items: filtered, total: filtered.length, page: 1, totalPages: 1 };
  },
  get: async (id: string) => {
    await delay();
    return { ...(INVENTORY.find((i) => i.id === id) ?? INVENTORY[0]), movements: [] };
  },
  create: async (data: unknown) => { await delay(); return { id: 'item_new', ...(data as object) }; },
  update: async (_id: string, data: unknown) => { await delay(); return data; },
  adjustStock: async () => { await delay(); return [{}]; },
  lowStockAlerts: async () => {
    await delay();
    return INVENTORY.filter((i) => i.isLowStock);
  },
  valuation: async () => {
    await delay();
    const items = INVENTORY.map((i) => ({ ...i, totalValue: i.quantityOnHand * i.costPrice }));
    return { items, totalValue: items.reduce((s, i) => s + i.totalValue, 0).toFixed(2) };
  },
};

export const mockCustomersApi = {
  list: async () => { await delay(); return { customers: CUSTOMERS, total: CUSTOMERS.length, page: 1, totalPages: 1 }; },
  get: async (id: string) => { await delay(); return CUSTOMERS.find((c) => c.id === id) ?? CUSTOMERS[0]; },
  create: async (data: unknown) => { await delay(); return { id: 'cust_new', ...(data as object) }; },
  update: async (_id: string, data: unknown) => { await delay(); return data; },
};

export const mockSuppliersApi = {
  list: async () => { await delay(); return { suppliers: SUPPLIERS, total: SUPPLIERS.length, page: 1, totalPages: 1 }; },
  get: async (id: string) => { await delay(); return SUPPLIERS.find((s) => s.id === id) ?? SUPPLIERS[0]; },
  create: async (data: unknown) => { await delay(); return { id: 'supp_new', ...(data as object) }; },
};

export const mockReportsApi = {
  incomeStatement: async () => {
    await delay();
    return {
      revenue: {
        accounts: [
          { code: '4000', name: 'Service Revenue', balance: 148000 },
          { code: '4100', name: 'Product Sales', balance: 56400 },
        ],
        total: 204400,
      },
      costOfGoodsSold: {
        accounts: [{ code: '5000', name: 'Cost of Goods Sold', balance: 38200 }],
        total: 38200,
      },
      grossProfit: 166200,
      operatingExpenses: [
        {
          category: 'Personnel',
          accounts: [{ code: '6000', name: 'Salaries & Wages', balance: 72000 }],
          total: 72000,
        },
        {
          category: 'Occupancy',
          accounts: [{ code: '6100', name: 'Rent Expense', balance: 24000 }],
          total: 24000,
        },
        {
          category: 'Operations',
          accounts: [
            { code: '6200', name: 'Utilities Expense', balance: 4800 },
            { code: '6300', name: 'Office Supplies', balance: 1640 },
            { code: '6400', name: 'Marketing & Ads', balance: 8200 },
          ],
          total: 14640,
        },
      ],
      totalOperatingExpenses: 110640,
      operatingIncome: 55560,
      netIncome: 55560,
    };
  },

  balanceSheet: async () => {
    await delay();
    return {
      assets: {
        current: {
          accounts: [
            { code: '1000', name: 'Cash on Hand', balance: 24500 },
            { code: '1010', name: 'Business Checking', balance: 87340 },
            { code: '1200', name: 'Accounts Receivable', balance: 62800 },
            { code: '1400', name: 'Inventory Asset', balance: 31200 },
          ],
          total: 205840,
        },
        nonCurrent: {
          accounts: [{ code: '1500', name: 'Office Equipment', balance: 18000 }],
          total: 18000,
        },
        total: 223840,
      },
      liabilities: {
        current: {
          accounts: [
            { code: '2000', name: 'Accounts Payable', balance: 14200 },
            { code: '2100', name: 'Accrued Liabilities', balance: 5800 },
            { code: '2200', name: 'Deferred Revenue', balance: 3000 },
          ],
          total: 23000,
        },
        nonCurrent: { accounts: [], total: 0 },
        total: 23000,
      },
      equity: {
        accounts: [
          { code: '3000', name: "Owner's Equity", balance: 165280 },
          { name: 'Retained Earnings (Current Year)', balance: 35560 },
        ],
        total: 200840,
      },
      totalLiabilitiesAndEquity: 223840,
      isBalanced: true,
    };
  },

  cashFlow: async () => {
    await delay();
    return {
      operating: {
        items: [
          { description: 'Net Income', amount: 55560 },
          { description: 'Increase in Accounts Receivable', amount: -12800 },
          { description: 'Decrease in Accounts Payable', amount: -3200 },
          { description: 'Depreciation', amount: 1800 },
        ],
        total: 41360,
      },
      investing: {
        items: [{ description: 'Purchase of Equipment', amount: -5000 }],
        total: -5000,
      },
      financing: {
        items: [{ description: "Owner's Draw", amount: -8000 }],
        total: -8000,
      },
      netChange: 28360,
      openingBalance: 83480,
      closingBalance: 111840,
    };
  },

  trialBalance: async () => {
    await delay();
    return ACCOUNTS.map((a) => ({
      code: a.code,
      name: a.name,
      type: a.type,
      debitBalance: ['ASSET', 'EXPENSE'].includes(a.type) ? a.balance : 0,
      creditBalance: ['LIABILITY', 'EQUITY', 'REVENUE'].includes(a.type) ? a.balance : 0,
    }));
  },

  aging: async (type: string) => {
    await delay();
    const relevant = type === 'receivables'
      ? INVOICES.filter((i) => ['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(i.status))
      : [];
    return {
      type,
      buckets: {
        current: { count: 2, amount: 18150 },
        days1_30: { count: 1, amount: 12400 },
        days31_60: { count: 2, amount: 12700 },
        days61_90: { count: 0, amount: 0 },
        over90: { count: 0, amount: 0 },
      },
      invoices: relevant,
    };
  },

  dashboard: async () => {
    await delay();
    return {
      totalRevenue: 28300,
      totalExpenses: 10569,
      netProfit: 17731,
      netProfitMargin: 62.6,
      totalReceivables: 43250,
      overdueInvoices: 2,
      lowStockItems: 2,
      monthlyData: MONTHLY_DATA,
    };
  },
};

export const mockUsersApi = {
  list: async () => {
    await delay();
    return {
      users: [
        { id: 'usr_demo_admin', name: 'Alex Johnson', email: 'admin@demo.com', role: 'ADMIN', isActive: true, createdAt: d(-180) },
        { id: 'usr_demo_acc', name: 'Sarah Chen', email: 'accountant@demo.com', role: 'ACCOUNTANT', isActive: true, createdAt: d(-120) },
        { id: 'usr_demo_staff', name: 'Marcus Rivera', email: 'staff@demo.com', role: 'STAFF', isActive: true, createdAt: d(-60) },
      ],
      total: 3, page: 1, totalPages: 1,
    };
  },
  create: async (data: unknown) => { await delay(); return { id: 'usr_new', ...(data as object) }; },
  update: async (_id: string, data: unknown) => { await delay(); return data; },
  auditLogs: async () => {
    await delay();
    return {
      logs: [
        { id: 'log_1', user: { name: 'Alex Johnson' }, action: 'CREATE', entity: 'Invoice', entityId: 'inv_5', createdAt: d(-10), ipAddress: '192.168.1.1' },
        { id: 'log_2', user: { name: 'Alex Johnson' }, action: 'UPDATE', entity: 'Expense', entityId: 'exp_1', createdAt: d(-5), ipAddress: '192.168.1.1' },
        { id: 'log_3', user: { name: 'Sarah Chen' }, action: 'CREATE', entity: 'Expense', entityId: 'exp_3', createdAt: d(-1), ipAddress: '192.168.1.2' },
      ],
      total: 3, page: 1, totalPages: 1,
    };
  },
};
