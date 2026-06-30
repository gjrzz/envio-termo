import { Router } from 'express';
import authRoutes from './authRoutes';
import assetRoutes from './assetRoutes';
import termRoutes from './termRoutes';
import generateTermRoutes from './generateTermRoutes';
import docusignRoutes from './docusignRoutes';
import glpiTestRoutes from './glpiTestRoutes';
import mondayRoutes from './mondayRoutes';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Auth (login publico, demais protegidas)
router.use(authRoutes);

// Rotas protegidas por autenticacao
router.use('/users', requireAuth, assetRoutes);
router.use('/terms', requireAuth, termRoutes);
router.use('/terms', requireAuth, generateTermRoutes);
router.use('/docusign', requireAuth, docusignRoutes);
router.use('/glpi', requireAuth, glpiTestRoutes);
router.use('/monday', requireAuth, mondayRoutes);

export default router;
