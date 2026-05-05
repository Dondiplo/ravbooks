import { Router, Request, Response } from 'express';
import { InventoryService } from './inventory.service';
import { authenticate } from '../../middleware/auth.middleware';
import { accountantOrAbove, staffOrAbove } from '../../middleware/rbac.middleware';

const router = Router();
const service = new InventoryService();

router.use(authenticate);

router.get('/', staffOrAbove, async (req: Request, res: Response) => {
  const data = await service.findAll({
    category: req.query.category as string,
    search: req.query.search as string,
    lowStock: req.query.lowStock === 'true',
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  });
  res.json({ success: true, data });
});

router.get('/alerts/low-stock', staffOrAbove, async (_req: Request, res: Response) => {
  res.json({ success: true, data: await service.getLowStockAlerts() });
});

router.get('/valuation', accountantOrAbove, async (_req: Request, res: Response) => {
  res.json({ success: true, data: await service.getValuation() });
});

router.get('/:id', staffOrAbove, async (req: Request, res: Response) => {
  res.json({ success: true, data: await service.findById(req.params.id) });
});

router.post('/', accountantOrAbove, async (req: Request, res: Response) => {
  const item = await service.create(req.body);
  res.status(201).json({ success: true, data: item });
});

router.put('/:id', accountantOrAbove, async (req: Request, res: Response) => {
  res.json({ success: true, data: await service.update(req.params.id, req.body) });
});

router.post('/movements', staffOrAbove, async (req: Request, res: Response) => {
  const result = await service.adjustStock({ ...req.body, userId: req.user!.id });
  res.status(201).json({ success: true, data: result });
});

export default router;
