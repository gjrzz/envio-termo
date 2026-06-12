import { Router } from 'express';
import { getAssignedAssets } from '../controllers/assetController';
import { validate } from '../middleware/validate';
import { emailParamSchema } from '../types/schemas';

const router = Router();

router.get('/:email/assets', validate(emailParamSchema, 'params'), getAssignedAssets);

export default router;
