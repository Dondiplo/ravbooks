# AccountIQ — Production-Grade Accounting System

A complete double-entry bookkeeping and accounting platform for small to mid-sized businesses.

---

## Architecture

```
accounting/
├── packages/
│   ├── backend/          # Express + TypeScript + Prisma API
│   └── frontend/         # Next.js 14 + Tailwind CSS
└── package.json          # Monorepo root
```

### Tech Stack

| Layer        | Technology                              |
|-------------|----------------------------------------|
| Frontend    | Next.js 14, React Query, Tailwind CSS, Recharts |
| Backend     | Node.js, Express, TypeScript            |
| Database    | PostgreSQL                              |
| ORM         | Prisma                                  |
| Auth        | JWT (access + refresh tokens)           |
| Validation  | express-validator, Zod                 |
| Decimals    | decimal.js (no float errors)            |

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Yarn (recommended) or npm

---

## Setup

### 1. Clone and install

```bash
cd "accounting"
yarn install
```

### 2. Configure the backend

```bash
cd packages/backend
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT secrets
```

**Minimum required `.env`:**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/accounting_db"
JWT_SECRET=at-least-32-random-characters-here
JWT_REFRESH_SECRET=another-32-random-characters-here
```

### 3. Configure the frontend

```bash
cd packages/frontend
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000/api  (default)
```

### 4. Run database migrations and seed

```bash
# From repo root:
yarn db:migrate    # runs prisma migrate dev
yarn db:seed       # seeds chart of accounts, users, sample data
```

### 5. Start the application

```bash
# Two terminals:
yarn dev:backend   # starts on http://localhost:4000
yarn dev:frontend  # starts on http://localhost:3000
```

Or both at once (requires concurrently):
```bash
yarn dev
```

---

## Demo Credentials

| Role        | Email                           | Password         |
|------------|--------------------------------|-----------------|
| Admin       | admin@accountiq.com             | Admin@123        |
| Accountant  | accountant@accountiq.com        | Accountant@123   |
| Staff       | staff@accountiq.com             | Staff@123        |

---

## Features

### Core Accounting Engine
- **Double-entry enforcement**: Every posted entry must have equal debits = credits. Rejected otherwise.
- **Immutable transactions**: No silent edits. Corrections via reversal entries only.
- **Decimal precision**: All calculations use `decimal.js` — no floating-point errors.
- **Derived reports**: All financial statements query the ledger directly.

### Modules

| Module              | Features                                              |
|--------------------|------------------------------------------------------|
| Dashboard           | KPIs, revenue/expense chart, alerts, recent invoices |
| Invoices            | Create, send, track payment status, auto-post to ledger |
| Expenses            | Record, categorize, approve workflow, ledger posting |
| Inventory           | Stock tracking, FIFO valuation, low-stock alerts     |
| General Ledger      | Journal entries, trial balance, account drill-down   |
| Financial Reports   | Income statement, balance sheet, cash flow statement |
| Cash Flow           | Inflow/outflow tracking, monthly chart               |
| Customers           | Customer management, invoice history                 |
| Suppliers           | Supplier management                                  |
| Users               | Role-based access (Admin/Accountant/Staff)           |
| Audit Logs          | Full audit trail of every action                     |

---

## API Endpoints

All routes are prefixed with `/api`.

### Auth
| Method | Path                     | Description          |
|--------|--------------------------|----------------------|
| POST   | /auth/login              | Login                |
| POST   | /auth/refresh            | Refresh token        |
| GET    | /auth/me                 | Current user         |
| PUT    | /auth/change-password    | Change password      |

### Accounts (Chart of Accounts)
| Method | Path                        | Description              |
|--------|-----------------------------|--------------------------|
| GET    | /accounts                   | List all accounts        |
| POST   | /accounts                   | Create account           |
| PUT    | /accounts/:id               | Update account           |
| GET    | /accounts/:id/balance       | Get account balance      |
| GET    | /accounts/:id/ledger        | Account ledger view      |

### Journal Entries
| Method | Path                        | Description              |
|--------|-----------------------------|--------------------------|
| GET    | /journal                    | List entries             |
| POST   | /journal                    | Post entry (validated)   |
| GET    | /journal/:id                | Entry detail             |
| POST   | /journal/:id/reverse        | Reverse entry            |
| GET    | /journal/trial-balance      | Trial balance            |

### Invoices
| Method | Path                        | Description              |
|--------|-----------------------------|--------------------------|
| GET    | /invoices                   | List invoices            |
| POST   | /invoices                   | Create invoice           |
| GET    | /invoices/:id               | Invoice detail           |
| POST   | /invoices/:id/send          | Send + post to ledger    |
| POST   | /invoices/:id/payments      | Record payment           |
| POST   | /invoices/:id/cancel        | Cancel + reverse entry   |

### Expenses
| Method | Path                        | Description              |
|--------|-----------------------------|--------------------------|
| GET    | /expenses                   | List expenses            |
| POST   | /expenses                   | Record expense           |
| POST   | /expenses/:id/approve       | Approve + post to ledger |
| POST   | /expenses/:id/reject        | Reject expense           |

### Inventory
| Method | Path                        | Description              |
|--------|-----------------------------|--------------------------|
| GET    | /inventory                  | List items               |
| POST   | /inventory                  | Create item              |
| PUT    | /inventory/:id              | Update item              |
| POST   | /inventory/movements        | Adjust stock             |
| GET    | /inventory/valuation        | Inventory valuation      |
| GET    | /inventory/alerts/low-stock | Low stock alerts         |

### Reports
| Method | Path                        | Description              |
|--------|-----------------------------|--------------------------|
| GET    | /reports/income-statement   | P&L statement            |
| GET    | /reports/balance-sheet      | Balance sheet            |
| GET    | /reports/cash-flow          | Cash flow statement      |
| GET    | /reports/trial-balance      | Trial balance            |
| GET    | /reports/aging/:type        | AR/AP aging report       |
| GET    | /reports/dashboard          | Dashboard metrics        |

---

## Database Schema

Key tables:

```
users               — Authentication and roles
accounts            — Chart of accounts (parent/child hierarchy)
journal_entries     — Every financial transaction header
journal_entry_lines — Individual debit/credit lines
invoices            — Customer invoices
invoice_items       — Invoice line items
payments            — Payment records linked to invoices
expenses            — Business expenses
inventory_items     — Products and stock
inventory_movements — Every stock-in / stock-out event
customers           — Customer master data
suppliers           — Supplier master data
purchase_orders     — Vendor purchase orders
audit_logs          — Full audit trail
```

---

## Accounting Rules Enforced

1. **Debits must equal credits** — validated before any entry is written
2. **No deletion** — use reversal entries
3. **Reports from ledger** — income statement, balance sheet, etc. query journal lines directly
4. **COGS tracking** — inventory sales automatically debit COGS and credit inventory
5. **Double posting** — invoice send posts AR/Revenue; payment posts Cash/AR

---

## Role Permissions

| Action                  | Staff | Accountant | Admin |
|------------------------|-------|------------|-------|
| View dashboard          | ✓     | ✓          | ✓     |
| Create invoices         | ✓     | ✓          | ✓     |
| Send invoices           | —     | ✓          | ✓     |
| Record expenses         | ✓     | ✓          | ✓     |
| Approve expenses        | —     | ✓          | ✓     |
| Post journal entries    | —     | ✓          | ✓     |
| Reverse entries         | —     | ✓          | ✓     |
| View reports            | —     | ✓          | ✓     |
| Manage users            | —     | —          | ✓     |
| View audit logs         | —     | ✓          | ✓     |

---

## Production Notes

- Set strong JWT secrets (32+ random chars each)
- Use `prisma migrate deploy` (not `dev`) in production
- Set `NODE_ENV=production`
- Place behind a reverse proxy (nginx) with TLS
- Configure rate limiting and CORS origin for your domain
# ravbooks
