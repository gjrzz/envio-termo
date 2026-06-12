import { Router } from 'express';
import assetRoutes from './assetRoutes';
import termRoutes from './termRoutes';
import glpiTestRoutes from './glpiTestRoutes';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.use('/users', assetRoutes);
router.use('/terms', termRoutes);
// Rota TEMPORARIA de debug - remover apos validar a integracao com o GLPI.
router.use('/glpi', glpiTestRoutes);

export default router;
