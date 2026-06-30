import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import './config/database';
import { authService } from './services/AuthService';

const app = createApp();

// Cria usuario admin padrao se o banco estiver vazio
authService.ensureDefaultUser().then(() => {
  app.listen(env.PORT, () => {
    logger.info(`Servidor rodando na porta ${env.PORT} (ambiente: ${env.NODE_ENV})`);
  });
});
