import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { JournalService } from './journal.service';
import { authenticate } from '../../middleware/auth.middleware';
import { accountantOrAbove } from '../../middleware/rbac.middleware';

const router = Router();
const service = new JournalService();

router.use(authenticate, accountantOrAbove);

router.get('/', async (req: Request, res: Response) => {
  const data = await service.findAll({
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    search: req.query.search as string,
    status: req.query.status as string,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  });
  res.json({ success: true, data });
});

router.get('/trial-balance', async (req: Request, res: Response) => {
  const asOfDate = (req.query.asOfDate as string) ?? new Date().toISOString().split('T')[0];
  const data = await service.getTrialBalance(asOfDate);
  res.json({ success: true, data });
});

router.get('/:id', async (req: Request, res: Response) => {
  res.json({ success: true, data: await service.findById(req.params.id) });
});

router.post(
  '/',
  [
    body('date').isISO8601(),
    body('description').trim().notEmpty(),
    body('lines').isArray({ min: 2 }),
    body('lines.*.accountId').isUUID(),
    body('lines.*.debit').isNumeric(),
    body('lines.*.credit').isNumeric(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const entry = await service.post({
      ...req.body,
      date: new Date(req.body.date),
      createdById: req.user!.id,
    });
    res.status(201).json({ success: true, data: entry });
  },
);

router.post('/:id/reverse', async (req: Request, res: Response) => {
  const { reversalDate, reason } = req.body;
  if (!reversalDate || !reason) {
    return res.status(400).json({ success: false, message: 'reversalDate and reason are required' });
  }
  const entry = await service.reverse(req.params.id, reversalDate, reason, req.user!.id);
  res.json({ success: true, data: entry });
});

export default router;
