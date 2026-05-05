import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export function auditLog(action: string, entity: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    let responseBody: unknown;

    res.json = function (body) {
      responseBody = body;
      return originalJson(body);
    };

    res.on('finish', async () => {
      if (!req.user || res.statusCode >= 400) return;

      const entityId =
        req.params.id ??
        (responseBody as Record<string, unknown>)?.data?.id?.toString() ??
        undefined;

      try {
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action,
            entity,
            entityId,
            newValues: req.method !== 'GET' ? (req.body as Record<string, unknown>) : undefined,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        });
      } catch (err) {
        logger.error('Audit log write failed', err);
      }
    });

    next();
  };
}
