// SaaS Flow — Server entry point
// Bootstrap order: env → container (DI wiring) → Express app → routes → error handler → listen

import 'dotenv/config';
import express from 'express';
import { buildContainer } from './interfaces/http/container';
import { createRouter } from './interfaces/http/routes';
import { globalErrorHandler } from './interfaces/http/middlewares/errorHandler.middleware';
import { requestLogger } from './interfaces/http/middlewares/requestLogger.middleware';
import { logger } from './infrastructure/logging/logger';

const PORT = process.env['PORT'] ?? 3000;
const NODE_ENV = process.env['NODE_ENV'] ?? 'development';

const app = express();

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
