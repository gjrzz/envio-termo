import express, { type Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
