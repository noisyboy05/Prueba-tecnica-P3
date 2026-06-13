// Winston Logger — centralized logging with context-aware child loggers
// Contexts: auth | subscription | billing | http
// Development: colored + human-readable output
// Production: structured JSON suitable for log aggregators (Datadog, CloudWatch, etc.)

import winston from 'winston';

const { combine, timestamp, colorize, errors, json, printf } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, context, ...meta }) => {
  const ctx = context !== undefined ? ` [${String(context)}]` : '';
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${String(ts)}${ctx} ${level}: ${String(message)}${metaStr}`;
});

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

const isDev = process.env['NODE_ENV'] !== 'production';

export const logger = winston.createLogger({
  level: process.env['LOG_LEVEL'] ?? (isDev ? 'debug' : 'info'),
  format: isDev
    ? combine(timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), colorize(), devFormat)
    : prodFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
  exitOnError: false,
});

export const authLogger = logger.child({ context: 'auth' });
export const subscriptionLogger = logger.child({ context: 'subscription' });
export const billingLogger = logger.child({ context: 'billing' });
export const httpLogger = logger.child({ context: 'http' });
