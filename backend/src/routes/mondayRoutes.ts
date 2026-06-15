import { Router } from 'express';
import {
  debugMondayBoard,
  getMondayEmployeeByEmail,
  sampleMondayItems,
} from '../controllers/mondayController';
import { validate } from '../middleware/validate';
import { emailParamSchema } from '../types/schemas';

const router = Router();

// Rotas TEMPORARIAS de debug - remover apos validar a integracao com o Monday.com.
router.get('/debug', debugMondayBoard);
router.get('/sample', sampleMondayItems);

router.get('/employee/:email', validate(emailParamSchema, 'params'), getMondayEmployeeByEmail);

export default router;
