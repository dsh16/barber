import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';

export function createApp(checkDatabase: () => Promise<unknown>) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/ready', async (_req, res) => {
    try {
      await checkDatabase();
      res.json({ status: 'ok', database: 'connected' });
    } catch {
      res.status(503).json({ status: 'error', database: 'unavailable' });
    }
  });
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  const errorHandler: express.ErrorRequestHandler = (error, _req, res, _next) => {
    const status = error?.status === 400 ? 400 : 500;
    if (status === 500) console.error(error);
    res.status(status).json({ error: status === 400 ? 'Invalid request' : 'Internal server error' });
  };
  app.use(errorHandler);
  return app;
}
