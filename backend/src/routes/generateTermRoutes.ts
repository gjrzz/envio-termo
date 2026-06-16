import { Router } from 'express';
import { generateTerm } from '../controllers/generateTermController';
import { validate } from '../middleware/validate';
import { generateTermSchema } from '../types/schemas';

const router = Router();

router.post('/generate', validate(generateTermSchema, 'body'), generateTerm);

export default router;
