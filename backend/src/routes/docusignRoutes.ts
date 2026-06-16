import { Router } from 'express';
import {
  docusignHealth,
  docusignTemplates,
  docusignTemplateDetails,
  docusignTestEnvelope,
} from '../controllers/docusignController';
import { validate } from '../middleware/validate';
import { testEnvelopeSchema } from '../types/schemas';

const router = Router();

router.get('/health', docusignHealth);
router.get('/templates', docusignTemplates);
router.get('/templates/:id', docusignTemplateDetails);
router.post('/test-envelope', validate(testEnvelopeSchema, 'body'), docusignTestEnvelope);

export default router;
