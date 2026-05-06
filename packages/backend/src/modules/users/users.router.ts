import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { UsersService } from './users.service';
import { authenticate } from '../../middleware/auth.middleware';
import { adminOnly, accountantOrAbove } from '../../middleware/rbac.middleware';

const router: Router = Router();
const service = new UsersService();

router.use(authenticate);

router.get('/', accountantOrAbove, async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  res.json({ success: true, data: await service.findAll(page, limit) });
});

router.get('/audit-logs', accountantOrAbove, async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const userId = req.query.userId as string | undefined;
  res.json({ success: true, data: await service.getAuditLogs(userId, page, limit) });
});

router.get('/:id', accountantOrAbove, async (req: Request, res: Response) => {
  res.json({ success: true, data: await service.findById(req.params.id) });
});

router.post(
  '/',
  adminOnly,
  [
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('role').isIn(['ADMIN', 'ACCOUNTANT', 'STAFF']),
  ],
  async (req: Request, res: Response) => {
    const user = await service.create(req.body);
    res.status(201).json({ success: true, data: user });
  },
);

router.put('/:id', adminOnly, async (req: Request, res: Response) => {
  const user = await service.update(req.params.id, req.body);
  res.json({ success: true, data: user });
});

router.post('/:id/reset-password', adminOnly, async (req: Request, res: Response) => {
  await service.resetPassword(req.params.id, req.body.newPassword);
  res.json({ success: true, message: 'Password reset successfully' });
});

export default router;
