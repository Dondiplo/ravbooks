import Decimal from 'decimal.js';
import { StockMovementType } from '@prisma/client';
import { prisma } from '../../config/database';
import { AccountingEngine } from '../../core/accounting/engine';
import { AppError } from '../../middleware/error.middleware';

const engine = new AccountingEngine(prisma);

interface CreateItemInput {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  costPrice: number;
  sellingPrice: number;
  reorderLevel?: number;
  assetAccountId?: string;
  cogsAccountId?: string;
  revenueAccountId?: string;
}

interface AdjustStockInput {
  inventoryItemId: string;
  type: StockMovementType;
  quantity: number;
  unitCost: number;
  date: string;
  reference?: string;
  supplierId?: string;
  notes?: string;
  userId: string;
}

export class InventoryService {
  async findAll(filters: {
    category?: string;
    search?: string;
    lowStock?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { category, search, lowStock, page = 1, limit = 20 } = filters;
    const where: Record<string, unknown> = { isActive: true };

    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (lowStock) {
      where.quantityOnHand = { lte: prisma.inventoryItem.fields.reorderLevel };
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    // Flag low stock items
    const itemsWithStatus = items.map((item) => ({
      ...item,
      isLowStock: new Decimal(item.quantityOnHand.toString()).lessThanOrEqualTo(
        item.reorderLevel.toString(),
      ),
    }));

    return { items: itemsWithStatus, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        movements: {
          orderBy: { date: 'desc' },
          take: 20,
          include: { supplier: { select: { name: true } } },
        },
      },
    });
    if (!item) throw new AppError(404, 'Inventory item not found');
    return item;
  }

  async create(data: CreateItemInput) {
    const exists = await prisma.inventoryItem.findUnique({ where: { sku: data.sku } });
    if (exists) throw new AppError(409, `SKU ${data.sku} already exists`);

    return prisma.inventoryItem.create({
      data: {
        ...data,
        costPrice: new Decimal(data.costPrice),
        sellingPrice: new Decimal(data.sellingPrice),
        reorderLevel: new Decimal(data.reorderLevel ?? 0),
        quantityOnHand: new Decimal(0),
      },
    });
  }

  async update(id: string, data: Partial<CreateItemInput>) {
    return prisma.inventoryItem.update({ where: { id }, data });
  }

  async adjustStock(input: AdjustStockInput) {
    const item = await prisma.inventoryItem.findUnique({ where: { id: input.inventoryItemId } });
    if (!item) throw new AppError(404, 'Item not found');

    const qty = new Decimal(input.quantity);
    const unitCost = new Decimal(input.unitCost);
    const totalCost = qty.abs().times(unitCost);
    const qtyBefore = new Decimal(item.quantityOnHand.toString());

    // For stock-out movements, quantity is negative
    const isOut = (
      [
        StockMovementType.SALE,
        StockMovementType.ADJUSTMENT_OUT,
        StockMovementType.RETURN_OUT,
        StockMovementType.WRITE_OFF,
      ] as StockMovementType[]
    ).includes(input.type);

    const qtyChange = isOut ? qty.abs().negated() : qty.abs();
    const qtyAfter = qtyBefore.plus(qtyChange);

    if (qtyAfter.isNegative()) {
      throw new AppError(400, `Insufficient stock. Available: ${qtyBefore.toFixed(3)}`);
    }

    // Build accounting entry if accounts are configured
    let journalEntryId: string | undefined;

    if (item.assetAccountId && item.cogsAccountId) {
      if (isOut) {
        // Cost flows out: Dr. COGS / Cr. Inventory
        const je = await engine.postJournalEntry({
          date: new Date(input.date),
          description: `Stock movement — ${item.name} (${input.type})`,
          reference: input.reference,
          sourceType: 'inventory',
          sourceId: item.id,
          lines: [
            { accountId: item.cogsAccountId, debit: totalCost, credit: new Decimal(0) },
            { accountId: item.assetAccountId, debit: new Decimal(0), credit: totalCost },
          ],
          createdById: input.userId,
        });
        journalEntryId = je.id;
      } else if (input.type === StockMovementType.PURCHASE) {
        // Stock in from purchase: Dr. Inventory / Cr. AP (2000) or Cash (1000)
        const creditAccountCode = input.supplierId ? '2000' : '1000';
        const creditAccount = await prisma.account.findFirst({
          where: { code: creditAccountCode },
        });
        if (creditAccount) {
          const je = await engine.postJournalEntry({
            date: new Date(input.date),
            description: `Stock purchase — ${item.name}`,
            reference: input.reference,
            sourceType: 'inventory',
            sourceId: item.id,
            lines: [
              { accountId: item.assetAccountId, debit: totalCost, credit: new Decimal(0) },
              { accountId: creditAccount.id, debit: new Decimal(0), credit: totalCost },
            ],
            createdById: input.userId,
          });
          journalEntryId = je.id;
        }
      }
    }

    return prisma.$transaction([
      prisma.inventoryMovement.create({
        data: {
          inventoryItemId: input.inventoryItemId,
          type: input.type,
          quantity: qtyChange.toDecimalPlaces(3),
          unitCost: unitCost.toDecimalPlaces(2),
          totalCost: totalCost.toDecimalPlaces(2),
          quantityBefore: qtyBefore.toDecimalPlaces(3),
          quantityAfter: qtyAfter.toDecimalPlaces(3),
          date: new Date(input.date),
          reference: input.reference,
          supplierId: input.supplierId,
          journalEntryId,
          notes: input.notes,
        },
      }),
      prisma.inventoryItem.update({
        where: { id: input.inventoryItemId },
        data: { quantityOnHand: qtyAfter.toDecimalPlaces(3) },
      }),
    ]);
  }

  async getLowStockAlerts() {
    const items = await prisma.inventoryItem.findMany({
      where: { isActive: true },
    });
    return items.filter((item) =>
      new Decimal(item.quantityOnHand.toString()).lessThanOrEqualTo(item.reorderLevel.toString()),
    );
  }

  async getValuation() {
    const items = await prisma.inventoryItem.findMany({ where: { isActive: true } });
    const valuation = items.map((item) => {
      const qty = new Decimal(item.quantityOnHand.toString());
      const cost = new Decimal(item.costPrice.toString());
      return {
        ...item,
        totalValue: qty.times(cost).toDecimalPlaces(2),
      };
    });
    const total = valuation.reduce(
      (s, i) => s.plus(i.totalValue),
      new Decimal(0),
    );
    return { items: valuation, totalValue: total.toDecimalPlaces(2) };
  }
}
