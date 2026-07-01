import { Router } from 'express';
import { getMondayEmployeeByEmail } from '../controllers/mondayController';
import { validate } from '../middleware/validate';
import { emailParamSchema } from '../types/schemas';

const router = Router();

router.get('/employee/:email', validate(emailParamSchema, 'params'), getMondayEmployeeByEmail);

export default router;
