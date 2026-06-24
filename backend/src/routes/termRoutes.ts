import { Router } from 'express';
import { getTermById, listTerms } from '../controllers/termController';
import { validate } from '../middleware/validate';
import { idParamSchema } from '../types/schemas';

const router = Router();

router.get('/', listTerms);
router.get('/:id', validate(idParamSchema, 'params'), getTermById);

export default router;
