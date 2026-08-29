import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'node:path';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';
import { apiLimiter } from './middleware/rateLimit.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' } // signature images load from mail clients
    })
  );

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (!env.isProd) app.use(morgan('dev'));

  // Rendered GIFs and uploaded assets. Long cache: filenames are versioned.
  app.use(
    '/static',
    express.static(path.resolve(process.cwd(), env.UPLOAD_DIR), {
      maxAge: '365d',
      immutable: true
    })
  );

  app.use('/api', apiLimiter, routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
