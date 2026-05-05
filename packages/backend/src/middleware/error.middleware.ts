import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      data: err.data,
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message });
  }

  if (err.message?.includes('Unique constraint')) {
    return res.status(409).json({ success: false, message: 'Record already exists' });
  }

  if (err.message?.includes('Record to delete does not exist')) {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }

  logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });

  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}

export function notFound(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route ${req.path} not found` });
}
