import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

const ROLE_HIERARCHY: Record<Role, number> = {
  ADMIN: 3,
  ACCOUNTANT: 2,
  STAFF: 1,
};

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userRole = req.user.role as Role;
    const hasPermission = roles.some(
      (r) => ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[r],
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. Required: ${roles.join(' or ')}`,
      });
    }

    next();
  };
}

export const adminOnly = requireRole(Role.ADMIN);
export const accountantOrAbove = requireRole(Role.ACCOUNTANT);
export const staffOrAbove = requireRole(Role.STAFF);
