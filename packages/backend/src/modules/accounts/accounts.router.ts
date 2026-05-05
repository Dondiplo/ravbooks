import { Router, Request, Response } from 'express';
import { AccountsService } from './accounts.service';
import { authenticate } from '../../middleware/auth.middleware';
import { accountantOrAbove, adminOnly } from '../../middleware/rbac.middleware';

const router = Router();
const service = new AccountsService();

router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  const { type, includeInactive } = req.query;
  const data = await service.findAll(type as any, includeInactive === 'true');
  res.json({ success: true, data });
});

router.get('/:id', async (req: Request, res: Response) => {
  res.json({ success: true, data: await service.findById(req.params.id) });
});

router.get('/:id/balance', async (req: Request, res: Response) => {
  const data = await service.getBalance(req.params.id, req.query.asOfDate as string);
  res.json({ success: true, data });
});

router.get('/:id/ledger', async (req: Request, res: Response) => {
  const { startDate, endDate, page, limit } = req.query;
  const data = await service.getLedger(
    req.params.id,
    startDate as string,
    endDate as string,
    parseInt(page as string) || 1,
    parseInt(limit as string) || 50,
  );
  res.json({ success: true, data });
});

router.post('/', accountantOrAbove, async (req: Request, res: Response) => {
  const account = await service.create(req.body);
  res.status(201).json({ success: true, data: account });
});

router.put('/:id', accountantOrAbove, async (req: Request, res: Response) => {
  const account = await service.update(req.params.id, req.body);
  res.json({ success: true, data: account });
});

export default router;
