import { Router, Request, Response } from 'express';
import { InvoicesService } from './invoices.service';
import { authenticate } from '../../middleware/auth.middleware';
import { accountantOrAbove, staffOrAbove } from '../../middleware/rbac.middleware';
import { PaymentMethod } from '@prisma/client';

const router = Router();
const service = new InvoicesService();

router.use(authenticate);

router.get('/', staffOrAbove, async (req: Request, res: Response) => {
  const data = await service.findAll({
    status: req.query.status as any,
    customerId: req.query.customerId as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    search: req.query.search as string,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  });
  res.json({ success: true, data });
});

router.get('/stats', staffOrAbove, async (_req: Request, res: Response) => {
  res.json({ success: true, data: await service.getStats() });
});

router.get('/:id', staffOrAbove, async (req: Request, res: Response) => {
  res.json({ success: true, data: await service.findById(req.params.id) });
});

router.post('/', staffOrAbove, async (req: Request, res: Response) => {
  const invoice = await service.create({ ...req.body, createdById: req.user!.id });
  res.status(201).json({ success: true, data: invoice });
});

router.post('/:id/send', accountantOrAbove, async (req: Request, res: Response) => {
  const invoice = await service.send(req.params.id);
  res.json({ success: true, data: invoice });
});

router.post('/:id/payments', accountantOrAbove, async (req: Request, res: Response) => {
  const invoice = await service.recordPayment(req.params.id, {
    ...req.body,
    createdById: req.user!.id,
  });
  res.json({ success: true, data: invoice });
});

router.post('/:id/cancel', accountantOrAbove, async (req: Request, res: Response) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ success: false, message: 'Reason required' });
  const invoice = await service.cancel(req.params.id, reason, req.user!.id);
  res.json({ success: true, data: invoice });
});

export default router;
