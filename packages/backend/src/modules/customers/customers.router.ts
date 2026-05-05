import { Router, Request, Response } from 'express';
import { prisma } from '../../config/database';
import { authenticate } from '../../middleware/auth.middleware';
import { staffOrAbove, accountantOrAbove } from '../../middleware/rbac.middleware';
import { generateCustomerCode } from '../../utils/sequence';
import { AppError } from '../../middleware/error.middleware';

const router = Router();

router.use(authenticate, staffOrAbove);

router.get('/', async (req: Request, res: Response) => {
  const search = req.query.search as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const where = search
    ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] }
    : {};

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
    prisma.customer.count({ where }),
  ]);

  res.json({ success: true, data: { customers, total, page, limit, totalPages: Math.ceil(total / limit) } });
});

router.get('/:id', async (req: Request, res: Response) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: { invoices: { orderBy: { date: 'desc' }, take: 10 } },
  });
  if (!customer) throw new AppError(404, 'Customer not found');
  res.json({ success: true, data: customer });
});

router.post('/', async (req: Request, res: Response) => {
  const code = await generateCustomerCode(prisma);
  const customer = await prisma.customer.create({ data: { ...req.body, code } });
  res.status(201).json({ success: true, data: customer });
});

router.put('/:id', async (req: Request, res: Response) => {
  const customer = await prisma.customer.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: customer });
});

export default router;
