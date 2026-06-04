// Entry point — HTTP server bootstrap
// Full implementation: Fase 10 (controllers, routes, middlewares)
import 'dotenv/config';
import express from 'express';

const app = express();
const PORT = process.env['PORT'] ?? 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`SaaS Flow API running on port ${PORT}`);
});

export default app;
