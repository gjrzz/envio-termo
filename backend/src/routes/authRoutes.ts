import { Router } from 'express';
import {
  login,
  getMe,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  updateAvatar,
} from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

// Publico (rate limit: 5 tentativas por minuto por IP)
router.post('/auth/login', rateLimit(5, 60_000), login);

// Protegido
router.get('/auth/me', requireAuth, getMe);
router.put('/auth/change-password', requireAuth, changePassword);
router.put('/auth/avatar', requireAuth, updateAvatar);

// CRUD de usuarios (protegido)
router.get('/users-management', requireAuth, listUsers);
router.post('/users-management', requireAuth, createUser);
router.put('/users-management/:id', requireAuth, updateUser);
router.delete('/users-management/:id', requireAuth, deleteUser);

export default router;
