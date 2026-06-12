import { Router } from 'express';
import { getTermById, listTerms, sendTerm } from '../controllers/termController';
import { validate } from '../middleware/validate';
import { idParamSchema, sendTermSchema } from '../types/schemas';

const router = Router();

router.post('/send', validate(sendTermSchema, 'body'), sendTerm);
router.get('/', listTerms);
router.get('/:id', validate(idParamSchema, 'params'), getTermById);

export default router;
