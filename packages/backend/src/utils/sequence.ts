import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';

export async function generateEntryNumber(prisma: PrismaClient): Promise<string> {
  const prefix = `JE-${dayjs().format('YYYYMM')}`;
  const last = await prisma.journalEntry.findFirst({
    where: { entryNumber: { startsWith: prefix } },
    orderBy: { entryNumber: 'desc' },
  });

  const seq = last ? parseInt(last.entryNumber.split('-')[2] ?? '0', 10) + 1 : 1;
  return `${prefix}-${String(seq).padStart(5, '0')}`;
}

export async function generateInvoiceNumber(prisma: PrismaClient): Promise<string> {
  const prefix = `INV-${dayjs().format('YYYYMM')}`;
  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
  });

  const seq = last ? parseInt(last.invoiceNumber.split('-')[2] ?? '0', 10) + 1 : 1;
  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

export async function generateExpenseNumber(prisma: PrismaClient): Promise<string> {
  const prefix = `EXP-${dayjs().format('YYYYMM')}`;
  const last = await prisma.expense.findFirst({
    where: { expenseNumber: { startsWith: prefix } },
    orderBy: { expenseNumber: 'desc' },
  });

  const seq = last ? parseInt(last.expenseNumber.split('-')[2] ?? '0', 10) + 1 : 1;
  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

export async function generatePaymentNumber(prisma: PrismaClient): Promise<string> {
  const prefix = `PAY-${dayjs().format('YYYYMM')}`;
  const last = await prisma.payment.findFirst({
    where: { paymentNumber: { startsWith: prefix } },
    orderBy: { paymentNumber: 'desc' },
  });

  const seq = last ? parseInt(last.paymentNumber.split('-')[2] ?? '0', 10) + 1 : 1;
  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

export async function generatePONumber(prisma: PrismaClient): Promise<string> {
  const prefix = `PO-${dayjs().format('YYYYMM')}`;
  const last = await prisma.purchaseOrder.findFirst({
    where: { poNumber: { startsWith: prefix } },
    orderBy: { poNumber: 'desc' },
  });

  const seq = last ? parseInt(last.poNumber.split('-')[2] ?? '0', 10) + 1 : 1;
  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

export async function generateCustomerCode(prisma: PrismaClient): Promise<string> {
  const last = await prisma.customer.findFirst({ orderBy: { code: 'desc' } });
  const seq = last ? parseInt(last.code.replace('CUST-', ''), 10) + 1 : 1;
  return `CUST-${String(seq).padStart(4, '0')}`;
}

export async function generateSupplierCode(prisma: PrismaClient): Promise<string> {
  const last = await prisma.supplier.findFirst({ orderBy: { code: 'desc' } });
  const seq = last ? parseInt(last.code.replace('SUP-', ''), 10) + 1 : 1;
  return `SUP-${String(seq).padStart(4, '0')}`;
}
