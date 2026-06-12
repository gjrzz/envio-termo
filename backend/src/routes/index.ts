import { Router } from 'express';
import assetRoutes from './assetRoutes';
import termRoutes from './termRoutes';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.use('/users', assetRoutes);
router.use('/terms', termRoutes);

export default router;
