import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import './config/database';

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`Servidor rodando na porta ${env.PORT} (ambiente: ${env.NODE_ENV})`);
});
