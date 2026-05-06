import { Router, Request, Response } from 'express';
import { ExpensesService } from './expenses.service';
import { authenticate } from '../../middleware/auth.middleware';
import { accountantOrAbove, staffOrAbove } from '../../middleware/rbac.middleware';

const router: Router = Router();
const service = new ExpensesService();

router.use(authenticate);

router.get('/', staffOrAbove, async (req: Request, res: Response) => {
  const data = await service.findAll({
    status: req.query.status as any,
    category: req.query.category as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    search: req.query.search as string,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  });
  res.json({ success: true, data });
});

router.get('/categories/stats', staffOrAbove, async (req: Request, res: Response) => {
  const data = await service.getCategoryStats(
    req.query.startDate as string,
    req.query.endDate as string,
  );
  res.json({ success: true, data });
});

router.get('/:id', staffOrAbove, async (req: Request, res: Response) => {
  res.json({ success: true, data: await service.findById(req.params.id) });
});

router.post('/', staffOrAbove, async (req: Request, res: Response) => {
  const expense = await service.create({ ...req.body, createdById: req.user!.id });
  res.status(201).json({ success: true, data: expense });
});

router.post('/:id/approve', accountantOrAbove, async (req: Request, res: Response) => {
  const expense = await service.approve(req.params.id, req.user!.id);
  res.json({ success: true, data: expense });
});

router.post('/:id/reject', accountantOrAbove, async (req: Request, res: Response) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ success: false, message: 'Reason required' });
  const expense = await service.reject(req.params.id, reason);
  res.json({ success: true, data: expense });
});

export default router;
