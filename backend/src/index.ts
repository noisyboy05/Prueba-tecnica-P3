// SaaS Flow — Server entry point
// Bootstrap order: env → CORS → body parsing → logging → container → routes → error handler → listen

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { buildContainer } from './interfaces/http/container';
import { createRouter } from './interfaces/http/routes';
import { globalErrorHandler } from './interfaces/http/middlewares/errorHandler.middleware';
import { requestLogger } from './interfaces/http/middlewares/requestLogger.middleware';
import { logger } from './infrastructure/logging/logger';

const PORT     = process.env['PORT']     ?? 3000;
const NODE_ENV = process.env['NODE_ENV'] ?? 'development';

// ── CORS configuration ────────────────────────────────────────────────────────
// Development:  allows http://localhost:5173 (Vite default)
// Production:   restricts to ALLOWED_ORIGIN env variable (must be set explicitly)
// Preflight:    OPTIONS requests are answered before any auth middleware runs

const allowedOrigins: string[] =
  NODE_ENV === 'production'
    ? (process.env['ALLOWED_ORIGIN'] ?? '').split(',').map((o) => o.trim()).filter(Boolean)
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps, server-to-server)
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' is not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204, // Some legacy browsers choke on 200 for OPTIONS
};

const app = express();

// CORS MUST be the first middleware — handles preflight OPTIONS before body parsing or auth
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // explicit preflight for all routes

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (before routes)
app.use(requestLogger);

// Build container — validates env vars and wires all dependencies
const container = buildContainer();

// API routes
app.use('/api', createRouter(container));

// Health check (outside /api, no auth required)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: NODE_ENV, timestamp: new Date().toISOString() });
});

// Global error handler — MUST be the last middleware registered
app.use(globalErrorHandler);

app.listen(PORT, () => {
  logger.info('SaaS Flow API started', { port: PORT, env: NODE_ENV });
});

export default app;
