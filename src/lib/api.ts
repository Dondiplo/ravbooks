import axios, { AxiosError } from 'axios';
import {
  mockAuthApi, mockAccountsApi, mockJournalApi, mockInvoicesApi,
  mockExpensesApi, mockInventoryApi, mockCustomersApi, mockSuppliersApi,
  mockReportsApi, mockUsersApi,
} from './mock-api';

// When no backend URL is configured we run in demo mode with mock data.
export const DEMO_MODE = !process.env.NEXT_PUBLIC_API_URL;

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          originalRequest.headers!.Authorization = `Bearer ${data.data.accessToken}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

// ─── Live API implementations ─────────────────────────────────────────────────

const liveAuthApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data.data),
  me: () => api.get('/auth/me').then((r) => r.data.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),
};

const liveAccountsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/accounts', { params }).then((r) => r.data.data),
  get: (id: string) => api.get(`/accounts/${id}`).then((r) => r.data.data),
  create: (data: unknown) => api.post('/accounts', data).then((r) => r.data.data),
  update: (id: string, data: unknown) => api.put(`/accounts/${id}`, data).then((r) => r.data.data),
  getBalance: (id: string, asOfDate?: string) =>
    api.get(`/accounts/${id}/balance`, { params: { asOfDate } }).then((r) => r.data.data),
  getLedger: (id: string, params?: Record<string, unknown>) =>
    api.get(`/accounts/${id}/ledger`, { params }).then((r) => r.data.data),
};

const liveJournalApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/journal', { params }).then((r) => r.data.data),
  get: (id: string) => api.get(`/journal/${id}`).then((r) => r.data.data),
  create: (data: unknown) => api.post('/journal', data).then((r) => r.data.data),
  reverse: (id: string, data: unknown) =>
    api.post(`/journal/${id}/reverse`, data).then((r) => r.data.data),
  trialBalance: (asOfDate?: string) =>
    api.get('/journal/trial-balance', { params: { asOfDate } }).then((r) => r.data.data),
};

const liveInvoicesApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/invoices', { params }).then((r) => r.data.data),
  stats: () => api.get('/invoices/stats').then((r) => r.data.data),
  get: (id: string) => api.get(`/invoices/${id}`).then((r) => r.data.data),
  create: (data: unknown) => api.post('/invoices', data).then((r) => r.data.data),
  send: (id: string) => api.post(`/invoices/${id}/send`).then((r) => r.data.data),
  recordPayment: (id: string, data: unknown) =>
    api.post(`/invoices/${id}/payments`, data).then((r) => r.data.data),
  cancel: (id: string, reason: string) =>
    api.post(`/invoices/${id}/cancel`, { reason }).then((r) => r.data.data),
};

const liveExpensesApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/expenses', { params }).then((r) => r.data.data),
  get: (id: string) => api.get(`/expenses/${id}`).then((r) => r.data.data),
  create: (data: unknown) => api.post('/expenses', data).then((r) => r.data.data),
  approve: (id: string) => api.post(`/expenses/${id}/approve`).then((r) => r.data.data),
  reject: (id: string, reason: string) =>
    api.post(`/expenses/${id}/reject`, { reason }).then((r) => r.data.data),
  categoryStats: (params?: Record<string, unknown>) =>
    api.get('/expenses/categories/stats', { params }).then((r) => r.data.data),
};

const liveInventoryApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/inventory', { params }).then((r) => r.data.data),
  get: (id: string) => api.get(`/inventory/${id}`).then((r) => r.data.data),
  create: (data: unknown) => api.post('/inventory', data).then((r) => r.data.data),
  update: (id: string, data: unknown) =>
    api.put(`/inventory/${id}`, data).then((r) => r.data.data),
  adjustStock: (data: unknown) => api.post('/inventory/movements', data).then((r) => r.data.data),
  lowStockAlerts: () => api.get('/inventory/alerts/low-stock').then((r) => r.data.data),
  valuation: () => api.get('/inventory/valuation').then((r) => r.data.data),
};

const liveCustomersApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/customers', { params }).then((r) => r.data.data),
  get: (id: string) => api.get(`/customers/${id}`).then((r) => r.data.data),
  create: (data: unknown) => api.post('/customers', data).then((r) => r.data.data),
  update: (id: string, data: unknown) =>
    api.put(`/customers/${id}`, data).then((r) => r.data.data),
};

const liveSuppliersApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/suppliers', { params }).then((r) => r.data.data),
  get: (id: string) => api.get(`/suppliers/${id}`).then((r) => r.data.data),
  create: (data: unknown) => api.post('/suppliers', data).then((r) => r.data.data),
};

const liveReportsApi = {
  incomeStatement: (params?: Record<string, unknown>) =>
    api.get('/reports/income-statement', { params }).then((r) => r.data.data),
  balanceSheet: (params?: Record<string, unknown>) =>
    api.get('/reports/balance-sheet', { params }).then((r) => r.data.data),
  cashFlow: (params?: Record<string, unknown>) =>
    api.get('/reports/cash-flow', { params }).then((r) => r.data.data),
  trialBalance: (params?: Record<string, unknown>) =>
    api.get('/reports/trial-balance', { params }).then((r) => r.data.data),
  aging: (type: string) => api.get(`/reports/aging/${type}`).then((r) => r.data.data),
  dashboard: () => api.get('/reports/dashboard').then((r) => r.data.data),
};

const liveUsersApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/users', { params }).then((r) => r.data.data),
  create: (data: unknown) => api.post('/users', data).then((r) => r.data.data),
  update: (id: string, data: unknown) => api.put(`/users/${id}`, data).then((r) => r.data.data),
  auditLogs: (params?: Record<string, unknown>) =>
    api.get('/users/audit-logs', { params }).then((r) => r.data.data),
};

// ─── Exported API (real or mock depending on environment) ─────────────────────

export const authApi     = DEMO_MODE ? mockAuthApi     : liveAuthApi;
export const accountsApi = DEMO_MODE ? mockAccountsApi : liveAccountsApi;
export const journalApi  = DEMO_MODE ? mockJournalApi  : liveJournalApi;
export const invoicesApi = DEMO_MODE ? mockInvoicesApi : liveInvoicesApi;
export const expensesApi = DEMO_MODE ? mockExpensesApi : liveExpensesApi;
export const inventoryApi = DEMO_MODE ? mockInventoryApi : liveInventoryApi;
export const customersApi = DEMO_MODE ? mockCustomersApi : liveCustomersApi;
export const suppliersApi = DEMO_MODE ? mockSuppliersApi : liveSuppliersApi;
export const reportsApi  = DEMO_MODE ? mockReportsApi  : liveReportsApi;
export const usersApi    = DEMO_MODE ? mockUsersApi    : liveUsersApi;
