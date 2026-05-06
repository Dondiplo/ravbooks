import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from './auth.service';
import { authenticate } from '../../middleware/auth.middleware';

const router: Router = Router();
const service = new AuthService();

const validate = (req: Request, res: Response, next: () => void) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ],
  validate,
  async (req: Request, res: Response) => {
    const result = await service.login(req.body.email, req.body.password, req.ip);
    res.json({ success: true, data: result });
  },
);

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });
  const result = await service.refresh(refreshToken);
  res.json({ success: true, data: result });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = await import('../../config/database').then(({ prisma }) =>
    prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, role: true, lastLoginAt: true, createdAt: true },
    }),
  );
  res.json({ success: true, data: user });
});

// PUT /api/auth/change-password
router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  validate,
  async (req: Request, res: Response) => {
    await service.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
    res.json({ success: true, message: 'Password changed successfully' });
  },
);

export default router;
