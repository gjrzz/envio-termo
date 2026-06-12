import { Router } from 'express';
import {
  debugFindGlpiComputersByContact,
  debugFindGlpiUserByEmail,
  debugGetGlpiComputerById,
  debugGetGlpiUserById,
  debugSearchGlpiUsers,
  debugValidateContactGeneration,
  testGlpiConnection,
} from '../controllers/glpiTestController';
import { validate } from '../middleware/validate';
import {
  glpiDebugComputerQuerySchema,
  glpiDebugComputersByContactQuerySchema,
  glpiDebugUserSearchQuerySchema,
  glpiDebugUsersQuerySchema,
  idParamSchema,
} from '../types/schemas';

const router = Router();

// Rotas TEMPORARIAS de debug - remover apos validar a integracao com o GLPI.
router.get('/test', testGlpiConnection);
router.get('/debug/users', validate(glpiDebugUsersQuerySchema, 'query'), debugFindGlpiUserByEmail);
router.get('/debug/user/:id', validate(idParamSchema, 'params'), debugGetGlpiUserById);
router.get(
  '/debug/user-search',
  validate(glpiDebugUserSearchQuerySchema, 'query'),
  debugSearchGlpiUsers,
);
router.get(
  '/debug/computer/:id',
  validate(idParamSchema, 'params'),
  validate(glpiDebugComputerQuerySchema, 'query'),
  debugGetGlpiComputerById,
);
router.get(
  '/debug/computers-by-contact',
  validate(glpiDebugComputersByContactQuerySchema, 'query'),
  debugFindGlpiComputersByContact,
);
router.get(
  '/debug/validate-contact',
  validate(glpiDebugUsersQuerySchema, 'query'),
  debugValidateContactGeneration,
);

export default router;
