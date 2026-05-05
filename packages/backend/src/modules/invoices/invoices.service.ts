import Decimal from 'decimal.js';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';
import { prisma } from '../../config/database';
import { AccountingEngine } from '../../core/accounting/engine';
import { AppError } from '../../middleware/error.middleware';
import {
  generateInvoiceNumber,
  generatePaymentNumber,
} from '../../utils/sequence';
import dayjs from 'dayjs';

const engine = new AccountingEngine(prisma);

// Standard account codes used for invoice posting
const ACCOUNTS_RECEIVABLE_CODE = '1200';
const SALES_TAX_PAYABLE_CODE = '2100';

interface InvoiceItemInput {
  inventoryItemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  taxRate?: number;
  sortOrder?: number;
}

interface CreateInvoiceInput {
  customerId: string;
  date: string;
  dueDate: string;
  items: InvoiceItemInput[];
  notes?: string;
  terms?: string;
  currency?: string;
  createdById: string;
}

export class InvoicesService {
  async findAll(filters: {
    status?: InvoiceStatus;
    customerId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, customerId, startDate, endDate, search, page = 1, limit = 20 } = filters;
    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          items: true,
          payments: true,
        },
        orderBy: [{ date: 'desc' }, { invoiceNumber: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    // Auto-update overdue status
    await this.markOverdueInvoices();

    return { invoices, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { inventoryItem: true }, orderBy: { sortOrder: 'asc' } },
        payments: true,
        createdBy: { select: { name: true, email: true } },
      },
    });
    if (!invoice) throw new AppError(404, 'Invoice not found');
    return invoice;
  }

  async create(input: CreateInvoiceInput) {
    const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new AppError(404, 'Customer not found');

    const invoiceNumber = await generateInvoiceNumber(prisma);
    const date = new Date(input.date);
    const dueDate = new Date(input.dueDate);

    // Calculate line items
    const computedItems = input.items.map((item, idx) => {
      const qty = new Decimal(item.quantity);
      const price = new Decimal(item.unitPrice);
      const disc = new Decimal(item.discountPct ?? 0).div(100);
      const amount = qty.times(price).times(new Decimal(1).minus(disc));
      return { ...item, amount, sortOrder: item.sortOrder ?? idx };
    });

    const subtotal = computedItems.reduce((s, i) => s.plus(i.amount), new Decimal(0));
    const taxAmount = computedItems.reduce((s, i) => {
      const taxRate = new Decimal(i.taxRate ?? 0).div(100);
      return s.plus(i.amount.times(taxRate));
    }, new Decimal(0));
    const total = subtotal.plus(taxAmount);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: input.customerId,
        date,
        dueDate,
        status: InvoiceStatus.DRAFT,
        subtotal: subtotal.toDecimalPlaces(2),
        taxAmount: taxAmount.toDecimalPlaces(2),
        discountAmount: new Decimal(0),
        total: total.toDecimalPlaces(2),
        balanceDue: total.toDecimalPlaces(2),
        amountPaid: new Decimal(0),
        notes: input.notes,
        terms: input.terms,
        currency: input.currency ?? 'USD',
        createdById: input.createdById,
        items: {
          create: computedItems.map((item) => ({
            inventoryItemId: item.inventoryItemId,
            description: item.description,
            quantity: new Decimal(item.quantity),
            unitPrice: new Decimal(item.unitPrice),
            discountPct: new Decimal(item.discountPct ?? 0),
            taxRate: new Decimal(item.taxRate ?? 0),
            amount: item.amount.toDecimalPlaces(2),
            sortOrder: item.sortOrder,
          })),
        },
      },
      include: { items: true, customer: true },
    });

    return invoice;
  }

  async send(id: string) {
    const invoice = await this.findById(id);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new AppError(400, 'Only draft invoices can be sent');
    }

    // Post to accounting ledger when invoice is sent
    const arAccount = await prisma.account.findFirst({ where: { code: ACCOUNTS_RECEIVABLE_CODE } });
    if (!arAccount) throw new AppError(500, 'Accounts Receivable account not configured');

    // Find revenue accounts for each line item
    const revenueAccount = await prisma.account.findFirst({ where: { code: '4000' } });
    if (!revenueAccount) throw new AppError(500, 'Revenue account not configured');

    const taxPayableAccount = await prisma.account.findFirst({
      where: { code: SALES_TAX_PAYABLE_CODE },
    });

    const total = new Decimal(invoice.total.toString());
    const taxAmount = new Decimal(invoice.taxAmount.toString());
    const subtotal = new Decimal(invoice.subtotal.toString());

    const lines = [
      {
        accountId: arAccount.id,
        debit: total,
        credit: new Decimal(0),
        description: `Invoice ${invoice.invoiceNumber} — ${invoice.customer.name}`,
      },
      {
        accountId: revenueAccount.id,
        debit: new Decimal(0),
        credit: subtotal,
        description: `Sales — Invoice ${invoice.invoiceNumber}`,
      },
    ];

    if (taxPayableAccount && taxAmount.greaterThan(0)) {
      lines.push({
        accountId: taxPayableAccount.id,
        debit: new Decimal(0),
        credit: taxAmount,
        description: `Sales Tax — Invoice ${invoice.invoiceNumber}`,
      });
      // Adjust revenue credit to subtotal (already done above)
    }

    const journalEntry = await engine.postJournalEntry({
      date: invoice.date,
      description: `Invoice ${invoice.invoiceNumber} — ${invoice.customer.name}`,
      reference: invoice.invoiceNumber,
      sourceType: 'invoice',
      sourceId: invoice.id,
      lines,
      createdById: invoice.createdById,
    });

    return prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.SENT, journalEntryId: journalEntry.id },
    });
  }

  async recordPayment(
    invoiceId: string,
    data: {
      amount: number;
      date: string;
      method: PaymentMethod;
      reference?: string;
      notes?: string;
      bankAccountCode?: string;
      createdById: string;
    },
  ) {
    const invoice = await this.findById(invoiceId);

    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
      throw new AppError(400, `Cannot record payment for ${invoice.status} invoice`);
    }

    const paymentAmount = new Decimal(data.amount);
    const balanceDue = new Decimal(invoice.balanceDue.toString());

    if (paymentAmount.greaterThan(balanceDue)) {
      throw new AppError(400, `Payment amount exceeds balance due of ${balanceDue.toFixed(2)}`);
    }

    const paymentNumber = await generatePaymentNumber(prisma);

    // Find cash/bank account
    const cashAccountCode = data.bankAccountCode ?? '1000';
    const cashAccount = await prisma.account.findFirst({ where: { code: cashAccountCode } });
    if (!cashAccount) throw new AppError(500, `Account ${cashAccountCode} not found`);

    const arAccount = await prisma.account.findFirst({
      where: { code: ACCOUNTS_RECEIVABLE_CODE },
    });
    if (!arAccount) throw new AppError(500, 'AR account not configured');

    // Post payment entry: Dr. Cash / Cr. AR
    const journalEntry = await engine.postJournalEntry({
      date: new Date(data.date),
      description: `Payment received — Invoice ${invoice.invoiceNumber}`,
      reference: paymentNumber,
      sourceType: 'payment',
      sourceId: invoiceId,
      lines: [
        { accountId: cashAccount.id, debit: paymentAmount, credit: new Decimal(0) },
        { accountId: arAccount.id, debit: new Decimal(0), credit: paymentAmount },
      ],
      createdById: data.createdById,
    });

    const newAmountPaid = new Decimal(invoice.amountPaid.toString()).plus(paymentAmount);
    const newBalanceDue = new Decimal(invoice.total.toString()).minus(newAmountPaid);
    const newStatus =
      newBalanceDue.isZero()
        ? InvoiceStatus.PAID
        : InvoiceStatus.PARTIALLY_PAID;

    await prisma.$transaction([
      prisma.payment.create({
        data: {
          paymentNumber,
          invoiceId,
          amount: paymentAmount.toDecimalPlaces(2),
          date: new Date(data.date),
          method: data.method,
          reference: data.reference,
          notes: data.notes,
          journalEntryId: journalEntry.id,
        },
      }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid.toDecimalPlaces(2),
          balanceDue: newBalanceDue.toDecimalPlaces(2),
          status: newStatus,
        },
      }),
    ]);

    return this.findById(invoiceId);
  }

  async cancel(id: string, reason: string, userId: string) {
    const invoice = await this.findById(id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new AppError(400, 'Cannot cancel a paid invoice');
    }

    // Reverse journal entry if invoice was sent
    if (invoice.journalEntryId) {
      await engine.reverseJournalEntry(invoice.journalEntryId, new Date(), reason, userId);
    }

    return prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED },
    });
  }

  private async markOverdueInvoices() {
    await prisma.invoice.updateMany({
      where: {
        status: InvoiceStatus.SENT,
        dueDate: { lt: new Date() },
      },
      data: { status: InvoiceStatus.OVERDUE },
    });
  }

  async getStats() {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, paid, pending, overdue, monthRevenue] = await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: InvoiceStatus.PAID } }),
      prisma.invoice.count({ where: { status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID] } } }),
      prisma.invoice.count({ where: { status: InvoiceStatus.OVERDUE } }),
      prisma.invoice.aggregate({
        where: { status: InvoiceStatus.PAID, date: { gte: firstOfMonth } },
        _sum: { total: true },
      }),
    ]);

    return {
      total,
      paid,
      pending,
      overdue,
      monthRevenue: monthRevenue._sum.total ?? 0,
    };
  }
}
