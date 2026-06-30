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

const router = Router();

// Publico
router.post('/auth/login', login);

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
