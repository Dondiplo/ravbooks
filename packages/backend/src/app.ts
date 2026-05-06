import 'express-async-errors';
import express, { Application, Router, RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { errorHandler, notFound } from './middleware/error.middleware';
import { logger } from './utils/logger';

import authRouter from './modules/auth/auth.router';
import usersRouter from './modules/users/users.router';
import accountsRouter from './modules/accounts/accounts.router';
import journalRouter from './modules/journal/journal.router';
import invoicesRouter from './modules/invoices/invoices.router';
import expensesRouter from './modules/expenses/expenses.router';
import inventoryRouter from './modules/inventory/inventory.router';
import customersRouter from './modules/customers/customers.router';
import suppliersRouter from './modules/suppliers/suppliers.router';
import reportsRouter from './modules/reports/reports.router';

const app: Application = express();

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  }),
);

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX ?? '100'),
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(compression() as unknown as RequestHandler);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: () => process.env.NODE_ENV === 'test',
  }),
);

// ─── Static files (uploads) ───────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
const api: Router = express.Router();

api.use('/auth', authRouter);
api.use('/users', usersRouter);
api.use('/accounts', accountsRouter);
api.use('/journal', journalRouter);
api.use('/invoices', invoicesRouter);
api.use('/expenses', expensesRouter);
api.use('/inventory', inventoryRouter);
api.use('/customers', customersRouter);
api.use('/suppliers', suppliersRouter);
api.use('/reports', reportsRouter);

app.use('/api', api);

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
