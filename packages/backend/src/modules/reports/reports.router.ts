import { Router, Request, Response } from 'express';
import { ReportsService } from './reports.service';
import { authenticate } from '../../middleware/auth.middleware';
import { accountantOrAbove } from '../../middleware/rbac.middleware';
import dayjs from 'dayjs';

const router = Router();
const service = new ReportsService();

router.use(authenticate, accountantOrAbove);

router.get('/income-statement', async (req: Request, res: Response) => {
  const now = dayjs();
  const startDate = (req.query.startDate as string) ?? now.startOf('month').format('YYYY-MM-DD');
  const endDate = (req.query.endDate as string) ?? now.endOf('month').format('YYYY-MM-DD');
  res.json({ success: true, data: await service.getIncomeStatement(startDate, endDate) });
});

router.get('/balance-sheet', async (req: Request, res: Response) => {
  const asOfDate = (req.query.asOfDate as string) ?? new Date().toISOString().split('T')[0];
  res.json({ success: true, data: await service.getBalanceSheet(asOfDate) });
});

router.get('/cash-flow', async (req: Request, res: Response) => {
  const now = dayjs();
  const startDate = (req.query.startDate as string) ?? now.startOf('month').format('YYYY-MM-DD');
  const endDate = (req.query.endDate as string) ?? now.endOf('month').format('YYYY-MM-DD');
  res.json({ success: true, data: await service.getCashFlowStatement(startDate, endDate) });
});

router.get('/trial-balance', async (req: Request, res: Response) => {
  const asOfDate = (req.query.asOfDate as string) ?? new Date().toISOString().split('T')[0];
  res.json({ success: true, data: await service.getTrialBalance(asOfDate) });
});

router.get('/aging/:type', async (req: Request, res: Response) => {
  const type = req.params.type as 'receivables' | 'payables';
  if (!['receivables', 'payables'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Invalid aging type' });
  }
  res.json({ success: true, data: await service.getAgingReport(type) });
});

router.get('/dashboard', async (_req: Request, res: Response) => {
  res.json({ success: true, data: await service.getDashboardMetrics() });
});

export default router;
