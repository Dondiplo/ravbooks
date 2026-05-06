import { Router, Request, Response } from 'express';
import { prisma } from '../../config/database';
import { authenticate } from '../../middleware/auth.middleware';
import { staffOrAbove } from '../../middleware/rbac.middleware';
import { generateSupplierCode } from '../../utils/sequence';
import { AppError } from '../../middleware/error.middleware';

const router: Router = Router();

router.use(authenticate, staffOrAbove);

router.get('/', async (req: Request, res: Response) => {
  const search = req.query.search as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const where = search
    ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }] }
    : {};

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
    prisma.supplier.count({ where }),
  ]);

  res.json({ success: true, data: { suppliers, total, page, limit, totalPages: Math.ceil(total / limit) } });
});

router.get('/:id', async (req: Request, res: Response) => {
  const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
  if (!supplier) throw new AppError(404, 'Supplier not found');
  res.json({ success: true, data: supplier });
});

router.post('/', async (req: Request, res: Response) => {
  const code = await generateSupplierCode(prisma);
  const supplier = await prisma.supplier.create({ data: { ...req.body, code } });
  res.status(201).json({ success: true, data: supplier });
});

router.put('/:id', async (req: Request, res: Response) => {
  const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: supplier });
});

export default router;
